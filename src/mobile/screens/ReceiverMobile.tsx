import { useEffect, useMemo, useRef, useState } from "react";
import { CompletionOverlay } from "../components/CompletionOverlay";
import { OpticalTransferDeck } from "../components/OpticalTransferDeck";
import { ReceivedImageViewer } from "../components/ReceivedImageViewer";
import { Button } from "../components/Button";
import { createKeyPair, publicKeyToString, type KeyPair } from "../../core/crypto/keyExchange";
import { decodePacket } from "../../core/protocol/decoder";
import { encodePacket } from "../../core/protocol/encoder";
import type { AckPacket, DataPacket, MetaPacket, StartPacket, StatusPacket } from "../../core/protocol/packets";
import { createSessionHint } from "../../core/protocol/session";
import { ReceiverBuffer } from "../../core/transfer/receiverBuffer";
import { bytesToObjectUrl, downloadBytes } from "../../media/imageTools";
import { Image as ImageIcon, RefreshCw } from "lucide-react";

type Props = {
  onBack: () => void;
};

type ReceiverState =
  | "scanning_start"
  | "receiving_meta"
  | "receiving_data"
  | "showing_status"
  | "reconstructing"
  | "done"
  | "error";

type ReceivedImage = { url: string; bytes: Uint8Array; fileName: string; mime: string };

/** Receptor móvil (AirQR 2.0), réplica de ReceiverScreen de la app nativa. */
export function ReceiverMobile({ onBack }: Props) {
  const keyPairRef = useRef<KeyPair | null>(null);
  if (!keyPairRef.current) {
    keyPairRef.current = createKeyPair();
  }

  const [state, setState] = useState<ReceiverState>("scanning_start");
  const [message, setMessage] = useState("Muestra este START al emisor y apunta la cámara a su pantalla.");
  const [meta, setMeta] = useState<MetaPacket | null>(null);
  const bufferRef = useRef<ReceiverBuffer | null>(null);
  const [status, setStatus] = useState<StatusPacket | null>(null);
  const [ack, setAck] = useState<AckPacket | null>(null);
  const [received, setReceived] = useState<ReceivedImage | null>(null);
  const [hashResult, setHashResult] = useState<{ hash: string; ok: boolean } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [corruptCount, setCorruptCount] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState("Nada");

  useEffect(() => {
    if (state === "done" && received) {
      setCelebrate(true);
    }
  }, [state, received]);

  const startPacket = useMemo<StartPacket>(
    () => ({ v: 1, t: "START", sidHint: createSessionHint(), rxPub: publicKeyToString(keyPairRef.current!.publicKey) }),
    [],
  );

  const qrPacket = ack ?? status ?? startPacket;
  const qrValue = encodePacket(qrPacket);
  const qrLabel = ack ? labelForAck(ack) : status ? `STATUS ${status.receivedCount}/${status.total}` : "START";

  function handleScan(raw: string) {
    const decoded = decodePacket(raw);
    if (!decoded.ok) {
      setLastSeen(`QR inválido: ${decoded.error}`);
      return;
    }
    const packet = decoded.packet;
    setLastSeen(packet.t === "DATA" ? `DATA ${packet.seq}` : packet.t);
    if (packet.t === "META") {
      handleMeta(packet as MetaPacket);
    } else if (packet.t === "DATA") {
      void handleData(packet as DataPacket);
    }
  }

  function handleMeta(packet: MetaPacket) {
    if (meta?.sid === packet.sid) {
      setAck(createAck(packet.sid, "META", undefined, 0, 0));
      setMessage("META repetido. Reenviando ACK META.");
      return;
    }
    try {
      bufferRef.current?.destroy();
      const buffer = new ReceiverBuffer(packet, keyPairRef.current!);
      bufferRef.current = buffer;
      setMeta(packet);
      setState("receiving_meta");
      setStatus(buffer.createStatus("receiving", null, "META recibido. Listo para DATA."));
      setAck(createAck(packet.sid, "META", undefined, 0, 0));
      setMessage(`Recibiendo ${packet.fileName}, ${packet.total} fragmentos.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo descifrar META");
    }
  }

  async function handleData(packet: DataPacket) {
    const buffer = bufferRef.current;
    if (!buffer || !meta || packet.sid !== meta.sid || state === "done") {
      return;
    }
    const before = buffer.snapshot();
    const expectedSeq = before.highestContiguous + 1;
    if (packet.seq < expectedSeq) {
      setAck(createAck(meta.sid, "DATA", before.highestContiguous, before.receivedCount, expectedSeq));
      setMessage(`DATA ${packet.seq} repetido. Reenviando ACK.`);
      return;
    }
    if (packet.seq > expectedSeq) {
      setAck(createAck(meta.sid, "DATA", before.highestContiguous >= 0 ? before.highestContiguous : undefined, before.receivedCount, expectedSeq));
      setMessage(`Esperando DATA ${expectedSeq}. Ignorando DATA ${packet.seq}.`);
      return;
    }

    const result = buffer.addPacket(packet);
    const snapshot = buffer.snapshot();
    setDuplicateCount(snapshot.duplicateCount);
    setCorruptCount(snapshot.corruptCount);

    if (result === "stored") {
      setState("receiving_data");
      setAck(createAck(meta.sid, "DATA", snapshot.highestContiguous, snapshot.receivedCount, snapshot.highestContiguous + 1));
      setMessage("Recibiendo fragmentos. Mantén la pantalla del emisor estable.");
    }
    if (result === "corrupt" || result === "wrong_session") {
      setMessage(`DATA ${packet.seq} no válido. Manteniendo último ACK.`);
      return;
    }

    if (snapshot.complete) {
      setState("reconstructing");
      setMessage("Todos los fragmentos recibidos. Reconstruyendo y validando hash.");
      try {
        const reconstructed = buffer.reconstruct();
        const url = bytesToObjectUrl(reconstructed.bytes, meta.mime);
        setReceived({ url, bytes: reconstructed.bytes, fileName: meta.fileName, mime: meta.mime });
        setHashResult({ hash: reconstructed.hash, ok: reconstructed.hashOk });
        setStatus(buffer.createStatus(reconstructed.hashOk ? "done" : "repair", reconstructed.hashOk));
        setAck(createAck(meta.sid, "DONE", undefined, snapshot.receivedCount, snapshot.receivedCount, reconstructed.hashOk));
        setState(reconstructed.hashOk ? "done" : "showing_status");
        setMessage(reconstructed.hashOk ? "Hash válido. Imagen reconstruida." : "Hash incorrecto. Pidiendo reparación.");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo reconstruir la imagen");
      }
      return;
    }
    setStatus(buffer.createStatus(snapshot.corruptCount > 0 ? "repair" : "receiving", null));
  }

  function reset() {
    bufferRef.current?.destroy();
    bufferRef.current = null;
    keyPairRef.current = createKeyPair();
    if (received) {
      URL.revokeObjectURL(received.url);
    }
    setMeta(null);
    setStatus(null);
    setAck(null);
    setReceived(null);
    setHashResult(null);
    setDuplicateCount(0);
    setCorruptCount(0);
    setCelebrate(false);
    setViewerOpen(false);
    setLastSeen("Nada");
    setState("scanning_start");
    setMessage("Receptor reiniciado. Vuelve a entrar para generar un START nuevo si lo necesitas.");
  }

  function save() {
    if (received) {
      downloadBytes(received.bytes, received.fileName, received.mime);
    }
  }

  async function share() {
    if (!received) {
      return;
    }
    try {
      const file = new File([new Uint8Array(received.bytes)], received.fileName, { type: received.mime });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: received.fileName });
        return;
      }
    } catch {
      // el usuario canceló o falló: caemos a descarga
    }
    save();
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  const total = status?.total ?? meta?.total ?? 0;
  const receivedCount = status?.receivedCount ?? 0;
  const processInfo = {
    title: "Proceso receptor",
    progress: total > 0 ? { completed: receivedCount, total, label: "Recibiendo foto" } : undefined,
    metrics: [
      { label: "Estado", value: labelForReceiverState(state) },
      { label: "Recibidos", value: receivedCount },
      { label: "Pendientes", value: Math.max(0, total - receivedCount) },
      { label: "Total", value: total },
      { label: "Duplicados", value: duplicateCount },
      { label: "Corruptos", value: corruptCount },
      { label: "Último visto", value: lastSeen },
      { label: "ACK", value: ack ? labelForAck(ack) : "START" },
      { label: "Archivo", value: meta?.fileName ?? "Esperando META" },
      { label: "Versión", value: "2.0 ventana" },
    ],
  };

  return (
    <>
      <OpticalTransferDeck
        title="Recibir"
        onBack={onBack}
        state={state}
        message={message}
        warning="Muestra el QR de estado al emisor cuando necesite confirmaciones."
        cameraActive={state !== "done"}
        cameraTitle={meta ? "Lee DATA del emisor" : "Espera META del emisor"}
        cameraHint="Apunta al QR del emisor."
        onScanned={handleScan}
        qrValue={qrValue}
        qrLabel={qrLabel}
        qrCaption="QR inferior: muestra START/STATUS al emisor."
        process={processInfo}
      >
        <div className="m-actions">
          {received ? (
            <Button label="Ver foto recibida" icon={ImageIcon} onClick={() => setViewerOpen(true)} className="m-action-btn" />
          ) : null}
          <Button label="Reiniciar transferencia" icon={RefreshCw} variant="secondary" onClick={reset} className="m-action-btn" />
        </div>
      </OpticalTransferDeck>

      <CompletionOverlay
        visible={celebrate}
        title="Transferencia completada"
        subtitle={hashResult?.ok ? "Hash verificado · abriendo…" : "Transferencia completada."}
        onHidden={() => {
          setCelebrate(false);
          if (received) {
            setViewerOpen(true);
          }
        }}
      />

      <ReceivedImageViewer
        visible={viewerOpen}
        uri={received?.url ?? null}
        fileName={received?.fileName ?? "foto.jpg"}
        hashOk={hashResult?.ok}
        canShare={canShare}
        onClose={() => setViewerOpen(false)}
        onSave={save}
        onShare={share}
      />
    </>
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
  return packet.ack === "DATA" ? `ACK DATA ${packet.seq ?? "?"}` : `ACK ${packet.ack}`;
}

function labelForReceiverState(state: ReceiverState): string {
  switch (state) {
    case "scanning_start":
      return "Esperando META";
    case "receiving_meta":
      return "META recibido";
    case "receiving_data":
      return "Recibiendo";
    case "showing_status":
      return "Mostrando STATUS";
    case "reconstructing":
      return "Reconstruyendo";
    case "done":
      return "Completado";
    case "error":
      return "Error";
    default:
      return state;
  }
}
