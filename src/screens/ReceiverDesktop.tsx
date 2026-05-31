import { useCallback, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, Download, RefreshCw, X } from "lucide-react";
import { createKeyPair, publicKeyToString, type KeyPair } from "../core/crypto/keyExchange";
import { decodePacket } from "../core/protocol/decoder";
import { encodePacket } from "../core/protocol/encoder";
import type { AckPacket, DataPacket, MetaPacket, StartPacket, StatusPacket } from "../core/protocol/packets";
import { createSessionHint } from "../core/protocol/session";
import { ReceiverBuffer } from "../core/transfer/receiverBuffer";
import { CompletionToast } from "../components/CompletionToast";
import { QrPanel } from "../components/QrPanel";
import { WebcamScanner } from "../components/WebcamScanner";
import { bytesToObjectUrl, downloadBytes } from "../media/imageTools";

type Props = {
  onBack: () => void;
};

type ScanLog = {
  id: number;
  message: string;
};

export function ReceiverDesktop({ onBack }: Props) {
  const keyPairRef = useRef<KeyPair>(createKeyPair());
  const bufferRef = useRef<ReceiverBuffer | null>(null);
  const [state, setState] = useState("scanning_start");
  const [message, setMessage] = useState("Muestra START al emisor y lee META/DATA con la webcam.");
  const [meta, setMeta] = useState<MetaPacket | null>(null);
  const [status, setStatus] = useState<StatusPacket | null>(null);
  const [ack, setAck] = useState<AckPacket | null>(null);
  const [receivedUrl, setReceivedUrl] = useState<string | null>(null);
  const [receivedBytes, setReceivedBytes] = useState<Uint8Array | null>(null);
  const [hashInfo, setHashInfo] = useState<{ hash: string; ok: boolean } | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [corruptCount, setCorruptCount] = useState(0);
  const [logs, setLogs] = useState<ScanLog[]>([{ id: 1, message: "Esperando META del emisor..." }]);
  const [startPacket, setStartPacket] = useState<StartPacket>(() => createStartPacket(keyPairRef.current));
  const qrPacket = ack ?? startPacket;
  const qrValue = encodePacket(qrPacket);
  const qrLabel = ack ? labelForAck(ack) : "START";
  const addLog = useCallback((entry: string) => {
    setLogs((current) => [{ id: Date.now() + Math.random(), message: entry }, ...current].slice(0, 8));
  }, []);

  const handleScan = useCallback(
    (raw: string) => {
      const decoded = decodePacket(raw);
      if (!decoded.ok) {
        return;
      }
      const packet = decoded.packet;
      if (packet.t === "META") {
        const nextMeta = packet as MetaPacket;
        if (meta?.sid === nextMeta.sid) {
          setAck(createAck(nextMeta.sid, "META", undefined, 0, 0));
          setMessage("META repetido. Reenviando ACK META.");
          addLog("META duplicado. ACK META reenviado.");
          return;
        }

        try {
          bufferRef.current?.destroy();
          const buffer = new ReceiverBuffer(nextMeta, keyPairRef.current);
          bufferRef.current = buffer;
          setMeta(nextMeta);
          setStatus(buffer.createStatus("receiving", null, "META recibido. Listo para DATA."));
          setAck(createAck(nextMeta.sid, "META", undefined, 0, 0));
          setState("receiving_meta");
          setMessage(`META recibido. Emitiendo ACK META para ${nextMeta.fileName}.`);
          addLog(`META recibido: ${nextMeta.fileName} · ${nextMeta.total} fragmentos.`);
        } catch (error) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "No se pudo descifrar META");
          addLog("Error descifrando META.");
        }
        return;
      }

      if (packet.t !== "DATA" || !meta || !bufferRef.current || packet.sid !== meta.sid || state === "done") {
        return;
      }

      const buffer = bufferRef.current;
      const data = packet as DataPacket;
      const before = buffer.snapshot();
      const expectedSeq = before.highestContiguous + 1;
      if (data.seq < expectedSeq) {
        setAck(createAck(meta.sid, "DATA", before.highestContiguous, before.receivedCount, expectedSeq));
        setMessage(`DATA ${data.seq} repetido. Reenviando ACK acumulativo.`);
        addLog(`Duplicado DATA ${data.seq}. ACK nextExpected ${expectedSeq}.`);
        return;
      }

      if (data.seq > expectedSeq) {
        setAck(createAck(meta.sid, "DATA", before.highestContiguous >= 0 ? before.highestContiguous : undefined, before.receivedCount, expectedSeq));
        setMessage(`Esperando DATA ${expectedSeq}. Ignorando DATA ${data.seq}.`);
        addLog(`Fuera de orden DATA ${data.seq}. Sigo esperando ${expectedSeq}.`);
        return;
      }

      const result = buffer.addPacket(data);
      const snapshot = buffer.snapshot();
      setDuplicateCount(snapshot.duplicateCount);
      setCorruptCount(snapshot.corruptCount);

      if (result !== "stored") {
        setMessage(`DATA ${data.seq} no valido. Manteniendo ACK actual.`);
        addLog(`DATA ${data.seq} no valido.`);
        return;
      }

      if (!snapshot.complete) {
        setState("receiving_data");
        setStatus(buffer.createStatus(snapshot.corruptCount > 0 ? "repair" : "receiving", null));
        setAck(createAck(meta.sid, "DATA", snapshot.highestContiguous, snapshot.receivedCount, snapshot.highestContiguous + 1));
        setMessage(`Recibido DATA ${data.seq}. Emitiendo ACK acumulativo.`);
        addLog(`DATA ${data.seq} recibido. ACK nextExpected ${snapshot.highestContiguous + 1}.`);
        return;
      }

      try {
        const reconstructed = buffer.reconstruct();
        const url = bytesToObjectUrl(reconstructed.bytes, meta.mime);
        setReceivedBytes(reconstructed.bytes);
        setReceivedUrl(url);
        setHashInfo({ hash: reconstructed.hash, ok: reconstructed.hashOk });
        setStatus(buffer.createStatus(reconstructed.hashOk ? "done" : "repair", reconstructed.hashOk));
        setAck(createAck(meta.sid, "DONE", undefined, snapshot.receivedCount, snapshot.receivedCount, reconstructed.hashOk));
        setState(reconstructed.hashOk ? "done" : "repair");
        setMessage(reconstructed.hashOk ? "Hash válido. Imagen reconstruida." : "Hash incorrecto. Pide reparación.");
        addLog(reconstructed.hashOk ? "Transferencia completada. Hash valido." : "Hash incorrecto tras reconstruccion.");
        if (reconstructed.hashOk) {
          setShowComplete(true);
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo reconstruir");
        addLog("Error reconstruyendo la imagen.");
      }
    },
    [addLog, meta, state],
  );

  function reset() {
    bufferRef.current?.destroy();
    const nextKeyPair = createKeyPair();
    keyPairRef.current = nextKeyPair;
    setStartPacket(createStartPacket(nextKeyPair));
    setMeta(null);
    setStatus(null);
    setAck(null);
    setReceivedUrl(null);
    setReceivedBytes(null);
    setHashInfo(null);
    setDuplicateCount(0);
    setCorruptCount(0);
    setShowComplete(false);
    setLogs([{ id: Date.now() + Math.random(), message: "Esperando META del emisor..." }]);
    setState("scanning_start");
    setMessage("Receptor reiniciado. Recarga la página para generar START nuevo visible.");
  }

  const received = status?.receivedCount ?? 0;
  const total = status?.total ?? meta?.total ?? 0;
  const progressPercent = total > 0 ? Math.round((received / total) * 100) : 0;

  if (state === "done" && receivedUrl && receivedBytes && meta) {
    return (
      <main className="desktop-screen result-screen">
        <section className="result-card">
          <button className="close-result" onClick={onBack} aria-label="Cerrar">
            <X size={20} />
          </button>
          <div className="success-icon">
            <CheckCircle2 size={42} />
          </div>
          <h1>Imagen recibida</h1>
          <p>Hash verificado correctamente.</p>
          <img src={receivedUrl} alt="Imagen recibida" />
          <button className="primary-pill" onClick={() => downloadBytes(receivedBytes, meta.fileName, meta.mime)}>
            <Download size={18} />
            Guardar Imagen
          </button>
          <button className="secondary-pill" onClick={onBack}>
            Cerrar
          </button>
        </section>
        <CompletionToast show={showComplete} title="Transferencia completada" message="La imagen recibida se ha abierto automáticamente." />
      </main>
    );
  }

  return (
    <main className="desktop-screen transfer-screen">
      <header className="desktop-topbar">
        <button className="back-button" onClick={onBack} aria-label="Volver">
          <ChevronLeft size={24} />
        </button>
        <h1>Recibiendo</h1>
      </header>

      <div className="transfer-grid">
        <WebcamScanner active={state !== "done"} title="Webcam activa" hint="Lee META y DATA del emisor." onScanned={handleScan} />
        <QrPanel value={qrValue} label={qrLabel} caption="QR de START / ACK para el emisor" />
      </div>

      <section className="receiver-bottom-grid">
        <div className="terminal-card">
          <h2>Registro de datos entrantes</h2>
          <div className="terminal-lines">
            {logs.map((entry) => (
              <p key={entry.id}>
                <span>&gt;</span> {entry.message}
              </p>
            ))}
          </div>
        </div>

        <div className="sender-progress-card">
          <div className="progress-heading">
            <div>
              <h2>{meta ? "Progreso de recepción" : "Esperando conexión"}</h2>
              <p>{message}</p>
            </div>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track" aria-label={`Progreso ${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="transfer-stats">
            <span>
              {received}/{total || 0} fragmentos · nextExpected {ack?.nextExpected ?? 0}
            </span>
            <span>
              Duplicados {duplicateCount} · Corruptos {corruptCount}
            </span>
            {hashInfo ? <span>Hash {hashInfo.ok ? "valido" : "incorrecto"} · {hashInfo.hash.slice(0, 18)}...</span> : null}
          </div>
          <button className="reset-button" onClick={reset}>
            <RefreshCw size={18} />
            Reiniciar receptor
          </button>
        </div>
      </section>

      <CompletionToast show={showComplete} title="Transferencia completada" message="La imagen recibida se ha abierto automáticamente." />
    </main>
  );
}

function createAck(
  sid: string,
  ack: AckPacket["ack"],
  seq: number | undefined,
  receivedCount: number,
  nextExpected: number,
  hashOk?: boolean,
): AckPacket {
  return { v: 1, t: "ACK", sid, ack, seq, receivedCount, nextExpected, hashOk };
}

function labelForAck(packet: AckPacket): string {
  if (packet.ack === "DATA") {
    return `ACK DATA ${packet.seq ?? "?"}`;
  }
  return `ACK ${packet.ack}`;
}

function createStartPacket(keyPair: KeyPair): StartPacket {
  return { v: 1, t: "START", sidHint: createSessionHint(), rxPub: publicKeyToString(keyPair.publicKey) };
}
