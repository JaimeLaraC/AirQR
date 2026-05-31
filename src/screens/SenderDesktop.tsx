import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ImageIcon, LoaderCircle, Pause, Play, RefreshCw, Upload } from "lucide-react";
import { compressionProfiles, defaultTransferConfig, type CompressionProfile } from "../core/config/transferConfig";
import { transferV2Config } from "../core/config/transferV2Config";
import { sha256Hex } from "../core/crypto/hashService";
import { decodePacket } from "../core/protocol/decoder";
import { encodePacket } from "../core/protocol/encoder";
import type { AckPacket, StartPacket, TransferPacket } from "../core/protocol/packets";
import { prepareTransferPackets, type PreparedTransfer } from "../core/transfer/senderPreparation";
import { CompletionToast } from "../components/CompletionToast";
import { QrPanel } from "../components/QrPanel";
import { WebcamScanner } from "../components/WebcamScanner";
import { compressImageFile, type DesktopImage } from "../media/imageTools";

type Props = {
  onBack: () => void;
};

export function SenderDesktop({ onBack }: Props) {
  const [profile, setProfile] = useState<CompressionProfile>(compressionProfiles[1] ?? compressionProfiles[0]!);
  const [image, setImage] = useState<DesktopImage | null>(null);
  const [stationOpen, setStationOpen] = useState(false);
  const [transfer, setTransfer] = useState<PreparedTransfer | null>(null);
  const [paused, setPaused] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("Selecciona una foto y escanea START del receptor.");
  const [showComplete, setShowComplete] = useState(false);
  const [metaAcked, setMetaAcked] = useState(false);
  const [windowBase, setWindowBase] = useState(0);
  const [visibleSeq, setVisibleSeq] = useState(0);
  const [lastAck, setLastAck] = useState("Sin ACK");
  const [lastAdvanceAt, setLastAdvanceAt] = useState(Date.now());
  const [retransmissions, setRetransmissions] = useState(0);

  const currentPacket: TransferPacket | null = transfer ? (metaAcked ? transfer.dataPackets[visibleSeq] ?? null : transfer.meta) : null;
  const qrValue = currentPacket ? encodePacket(currentPacket) : "";
  const total = transfer?.meta.total ?? 0;
  const windowEnd = transfer ? Math.min(total - 1, windowBase + transferV2Config.windowSize - 1) : 0;

  useEffect(() => {
    if (!transfer || !metaAcked || paused || state !== "streaming_data") {
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleSeq((seq) => {
        const end = Math.min(total - 1, windowBase + transferV2Config.windowSize - 1);
        if (seq < windowBase || seq >= end) {
          return windowBase;
        }
        return seq + 1;
      });
    }, transferV2Config.qrFrameMs);

    return () => window.clearInterval(timer);
  }, [metaAcked, paused, state, total, transfer, windowBase]);

  useEffect(() => {
    if (!transfer || !metaAcked || paused || state !== "streaming_data") {
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() - lastAdvanceAt >= transferV2Config.ackTimeoutMs) {
        setVisibleSeq(windowBase);
        setRetransmissions((count) => count + 1);
        setLastAdvanceAt(Date.now());
      }
    }, transferV2Config.ackTimeoutMs);

    return () => window.clearInterval(timer);
  }, [lastAdvanceAt, metaAcked, paused, state, transfer, windowBase]);

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }
    try {
      resetTransferOnly();
      setState("preparing");
      setMessage("Comprimiendo imagen en Canvas y calculando hash.");
      const compressed = await compressImageFile(file, profile);
      setImage(compressed);
      setStationOpen(false);
      setState("ready");
      setMessage("Imagen lista. Pulsa Comenzar a enviar para abrir cámara y QR.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo preparar la imagen");
    }
  }

  const handleAck = useCallback(
    (ack: AckPacket) => {
      if (!transfer || ack.sid !== transfer.sid) {
        return;
      }

      if (ack.ack === "DONE" && ack.hashOk) {
        setConfirmed(transfer.meta.total);
        setMetaAcked(false);
        setLastAck("ACK DONE");
        setState("done");
        setMessage("Transferencia completada.");
        setShowComplete(true);
        return;
      }

      if (ack.ack === "META") {
        if (metaAcked) {
          return;
        }
        setMetaAcked(true);
        setWindowBase(0);
        setVisibleSeq(0);
        setConfirmed(0);
        setLastAck("ACK META");
        setLastAdvanceAt(Date.now());
        setMessage(`ACK META recibido. Rotando ventana DATA 0-${Math.min(transfer.meta.total - 1, transferV2Config.windowSize - 1)}.`);
        return;
      }

      if (ack.ack !== "DATA" || !metaAcked) {
        return;
      }

      const nextExpected = clamp(ack.nextExpected, 0, transfer.meta.total);
      if (nextExpected <= windowBase) {
        setLastAck(`ACK atrasado ${nextExpected}`);
        return;
      }

      setConfirmed(Math.max(ack.receivedCount, nextExpected));
      setWindowBase(nextExpected);
      setVisibleSeq(nextExpected < transfer.meta.total ? nextExpected : Math.max(0, transfer.meta.total - 1));
      setLastAdvanceAt(Date.now());
      setLastAck(`ACK hasta ${nextExpected - 1}`);

      if (nextExpected >= transfer.meta.total) {
        setState("waiting_done");
        setMessage("Todos los DATA confirmados. Esperando ACK DONE.");
        return;
      }

      setMessage(`ACK acumulativo recibido. Ventana DATA ${nextExpected}-${Math.min(transfer.meta.total - 1, nextExpected + transferV2Config.windowSize - 1)}.`);
    },
    [metaAcked, transfer, windowBase],
  );

  const handleScan = useCallback(
    (raw: string) => {
      const decoded = decodePacket(raw);
      if (!decoded.ok) {
        return;
      }
      const packet = decoded.packet;
      if (packet.t === "START" && image && !transfer) {
        const hash = sha256Hex(image.bytes);
        const prepared = prepareTransferPackets({
          receiverStart: packet as StartPacket,
          fileBytes: image.bytes,
          fileName: image.fileName,
          mime: image.mime,
          hash,
          profile: profile.id,
          chunkSize: defaultTransferConfig.chunkSize,
        });
        setTransfer(prepared);
        setConfirmed(0);
        setMetaAcked(false);
        setWindowBase(0);
        setVisibleSeq(0);
        setLastAck("Esperando ACK META");
        setLastAdvanceAt(Date.now());
        setRetransmissions(0);
        setState("streaming_data");
        setMessage("Mostrando META. La ventana V2 empezará tras ACK META.");
        return;
      }

      if (!transfer || packet.sid !== transfer.sid) {
        return;
      }

      if (packet.t === "ACK") {
        handleAck(packet as AckPacket);
      }
    },
    [handleAck, image, profile.id, transfer],
  );

  function resetTransferOnly() {
    setTransfer(null);
    setConfirmed(0);
    setPaused(false);
    setShowComplete(false);
    setMetaAcked(false);
    setWindowBase(0);
    setVisibleSeq(0);
    setLastAck("Sin ACK");
    setLastAdvanceAt(Date.now());
    setRetransmissions(0);
  }

  function resetAll() {
    resetTransferOnly();
    setImage(null);
    setStationOpen(false);
    setState("idle");
    setMessage("Selecciona una foto y escanea START del receptor.");
  }

  const qrLabel = currentPacket?.t === "DATA" && transfer ? `DATA ${currentPacket.seq + 1}/${transfer.meta.total}` : currentPacket?.t ?? "QR emisor";
  const progressPercent = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const progressText = transfer
    ? metaAcked
      ? `Ventana V2 ${windowBase}-${windowEnd} · visible ${visibleSeq} · ${lastAck}`
      : `Mostrando META · ${lastAck}`
    : "Esperando START del receptor";

  if (!stationOpen || !image) {
    return (
      <main className="desktop-screen preflight-screen">
        <header className="desktop-topbar">
          <button className="back-button" onClick={onBack} aria-label="Volver">
            <ChevronLeft size={24} />
          </button>
          <h1>Preparar envío</h1>
        </header>

        <section className="preflight-content">
          <div className="preflight-icon" aria-hidden="true">
            {state === "preparing" ? <LoaderCircle className="spin" size={40} /> : <Upload size={42} />}
          </div>
          <h2>{state === "preparing" ? "Preparando imagen" : "Selecciona una foto"}</h2>
          <p>{state === "preparing" ? "Comprimiendo y calculando hash." : "La foto se comprime antes de abrir la estación óptica."}</p>

          <div className="profile-row">
            {compressionProfiles.map((item) => (
              <button key={item.id} className={profile.id === item.id ? "active" : ""} disabled={state === "preparing"} onClick={() => setProfile(item)}>
                {item.label}
              </button>
            ))}
          </div>

          {image ? (
            <div className="selected-file-card">
              <div className="selected-file-icon">
                <ImageIcon size={26} />
              </div>
              <div>
                <strong>{image.fileName}</strong>
                <span>
                  {formatBytes(image.originalSize)} → {formatBytes(image.compressedSize)}
                </span>
              </div>
              <label className="ghost-file-button">
                Cambiar foto
                <input type="file" accept="image/*" disabled={state === "preparing"} onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : (
            <label className="upload-drop">
              <Upload size={24} />
              <span>Subir foto</span>
              <input type="file" accept="image/*" disabled={state === "preparing"} onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
            </label>
          )}

          <button className="primary-pill" disabled={!image || state === "preparing"} onClick={() => setStationOpen(true)}>
            Comenzar a enviar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="desktop-screen transfer-screen">
      <header className="desktop-topbar">
        <button className="back-button" onClick={onBack} aria-label="Volver">
          <ChevronLeft size={24} />
        </button>
        <h1>Transmitiendo</h1>
      </header>

      <div className="transfer-grid">
        <WebcamScanner active={state !== "done"} title="Webcam activa" hint="Lee START, ACK META y ACK DATA." onScanned={handleScan} />
        <QrPanel value={state !== "done" ? qrValue : ""} label={qrLabel} caption="QR emitido al receptor" />
      </div>

      <section className="sender-progress-card">
        <div className="progress-heading">
          <div>
            <h2>Progreso de confirmación</h2>
            <p>{message}</p>
          </div>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="progress-track" aria-label={`Progreso ${progressPercent}%`}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="transfer-stats">
          <span>{progressText}</span>
          <span>
            {confirmed}/{total || 0} confirmados · retransmisiones {retransmissions}
          </span>
        </div>
        <div className="button-row">
          <button onClick={() => setPaused((value) => !value)} disabled={!transfer || state === "done"}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
            {paused ? "Reanudar" : "Pausar"}
          </button>
          <button onClick={resetAll}>
            <RefreshCw size={18} />
            Reiniciar
          </button>
        </div>
        <p className="file-note">
          <ImageIcon size={15} /> {profile.label} · {formatBytes(image.originalSize)} → {formatBytes(image.compressedSize)}
        </p>
      </section>

      <CompletionToast show={showComplete} title="Transferencia completada" message="El receptor confirmó el hash correcto." />
    </main>
  );
}

function formatBytes(value: number): string {
  return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
