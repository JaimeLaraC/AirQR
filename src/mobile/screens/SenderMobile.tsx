import { ArrowRight, Image as ImageIcon, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AmbientBackground } from "../components/AmbientBackground";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { CompletionOverlay } from "../components/CompletionOverlay";
import { MotionView } from "../components/MotionView";
import { OpticalTransferDeck } from "../components/OpticalTransferDeck";
import { SegmentedControl } from "../components/SegmentedControl";
import { compressionProfiles, type CompressionProfile, type CompressionProfileId } from "../../core/config/transferConfig";
import { transferV2Config } from "../../core/config/transferV2Config";
import { sha256Hex } from "../../core/crypto/hashService";
import { decodePacket } from "../../core/protocol/decoder";
import { encodePacket } from "../../core/protocol/encoder";
import type { AckPacket, DonePacket, StartPacket, StatusPacket, TransferPacket } from "../../core/protocol/packets";
import { prepareTransferPackets, type PreparedTransfer } from "../../core/transfer/senderPreparation";
import { compressImageFile, type DesktopImage } from "../../media/imageTools";
import { pickImageFile } from "../media/imagePicker";

type Props = {
  onBack: () => void;
};

type Stage = "setup" | "transfer";
type SenderState = "idle" | "showing_start" | "streaming_data" | "waiting_status" | "repairing" | "done" | "error";

export function SenderMobile({ onBack }: Props) {
  const defaultProfile = compressionProfiles[1] ?? compressionProfiles[0]!;
  const [stage, setStage] = useState<Stage>("setup");
  const [profile, setProfile] = useState<CompressionProfile>(defaultProfile);
  const [state, setState] = useState<SenderState>("idle");
  const [message, setMessage] = useState("Apunta la cámara al QR del receptor para empezar.");
  const [preparing, setPreparing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [preparedFile, setPreparedFile] = useState<DesktopImage | null>(null);
  const [transfer, setTransfer] = useState<PreparedTransfer | null>(null);
  const [paused, setPaused] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [lastAck, setLastAck] = useState("Sin ACK");
  const [lastSeen, setLastSeen] = useState("Nada");
  const [metaAcked, setMetaAcked] = useState(false);
  const [windowBase, setWindowBase] = useState(0);
  const [visibleSeq, setVisibleSeq] = useState(0);
  const [lastAdvanceAt, setLastAdvanceAt] = useState(Date.now());
  const [retransmissions, setRetransmissions] = useState(0);
  const processedAckKeys = useRef(new Set<string>());

  useEffect(() => {
    if (state === "done") {
      setCelebrate(true);
    }
  }, [state]);

  // Rotación de la ventana de QR (AirQR 2.0).
  useEffect(() => {
    if (!transfer || !metaAcked || paused || state !== "streaming_data") {
      return;
    }
    const total = transfer.dataPackets.length;
    if (total === 0 || windowBase >= total) {
      return;
    }
    const interval = setInterval(() => {
      setVisibleSeq((seq) => {
        const end = Math.min(total - 1, windowBase + transferV2Config.windowSize - 1);
        if (seq < windowBase || seq >= end) {
          return windowBase;
        }
        return seq + 1;
      });
    }, transferV2Config.qrFrameMs);
    return () => clearInterval(interval);
  }, [metaAcked, paused, state, transfer, windowBase]);

  // Reenvío de la ventana si el receptor no confirma a tiempo.
  useEffect(() => {
    if (!transfer || !metaAcked || paused || state !== "streaming_data") {
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - lastAdvanceAt >= transferV2Config.ackTimeoutMs) {
        setVisibleSeq(windowBase);
        setRetransmissions((count) => count + 1);
        setLastAdvanceAt(Date.now());
      }
    }, transferV2Config.ackTimeoutMs);
    return () => clearInterval(interval);
  }, [lastAdvanceAt, metaAcked, paused, state, transfer, windowBase]);

  const currentPacket: TransferPacket | null = transfer
    ? metaAcked
      ? transfer.dataPackets[visibleSeq] ?? null
      : transfer.meta
    : null;
  const currentQr = currentPacket ? encodePacket(currentPacket) : "";
  const total = transfer?.meta.total ?? 0;
  const pending = transfer ? Math.max(0, total - confirmed) : 0;
  const sentCount = transfer ? (metaAcked ? Math.min(total, Math.max(confirmed, visibleSeq + 1)) : 1) : 0;
  const windowEnd = transfer ? Math.min(total - 1, windowBase + transferV2Config.windowSize - 1) : 0;

  async function preparePhoto() {
    try {
      setSetupError(null);
      setPreparing(true);
      const file = await pickImageFile();
      if (!file) {
        setPreparing(false);
        return;
      }
      const image = await compressImageFile(file, profile);
      setPreparedFile(image);
      setState("showing_start");
      setMessage("Foto lista. Apunta la cámara al QR del receptor.");
      setPreparing(false);
    } catch (error) {
      setPreparing(false);
      setSetupError(error instanceof Error ? error.message : "Error preparando la foto");
    }
  }

  function handleScan(raw: string) {
    const decoded = decodePacket(raw);
    if (!decoded.ok) {
      setLastSeen(`QR inválido: ${decoded.error}`);
      return;
    }
    const packet = decoded.packet;
    setLastSeen(labelForPacket(packet));

    if (packet.t === "START" && preparedFile && !transfer) {
      try {
        const prepared = prepareTransferPackets({
          receiverStart: packet as StartPacket,
          fileBytes: preparedFile.bytes,
          fileName: preparedFile.fileName,
          mime: preparedFile.mime,
          hash: sha256Hex(preparedFile.bytes),
          profile: profile.id,
        });
        setTransfer(prepared);
        setConfirmed(0);
        setLastAck("Esperando ACK META");
        setMetaAcked(false);
        setWindowBase(0);
        setVisibleSeq(0);
        setLastAdvanceAt(Date.now());
        setRetransmissions(0);
        processedAckKeys.current.clear();
        setState("streaming_data");
        setMessage("Mostrando META. Al recibir ACK, empezará la ventana rápida V2.");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo iniciar la sesión cifrada");
      }
      return;
    }

    if (!transfer || packet.sid !== transfer.sid) {
      if (packet.sid) {
        setLastSeen(`${labelForPacket(packet)} de otra sesión`);
      }
      return;
    }

    if (packet.t === "ACK") {
      handleWindowedAck(packet as AckPacket);
    }
    if (packet.t === "STATUS") {
      const status = packet as StatusPacket;
      setConfirmed(status.receivedCount);
      if (status.hashOk) {
        setState("done");
        setMessage("El receptor reconstruyó la imagen y el hash coincide.");
      }
    }
    if (packet.t === "DONE") {
      const done = packet as DonePacket;
      if (done.hashOk) {
        setState("done");
        setMessage("El receptor confirmó hash válido. Transferencia terminada.");
      }
    }
  }

  function handleWindowedAck(ack: AckPacket) {
    if (!transfer) {
      return;
    }
    const ackKey = keyForAck(ack);
    if (ack.ack === "DONE" && ack.hashOk) {
      if (processedAckKeys.current.has(ackKey)) {
        return;
      }
      processedAckKeys.current.add(ackKey);
      setConfirmed(transfer.meta.total);
      setLastAck("ACK DONE");
      setState("done");
      setMetaAcked(false);
      setMessage("El receptor reconstruyó la imagen y el hash coincide.");
      return;
    }
    if (ack.ack === "META") {
      if (metaAcked || processedAckKeys.current.has(ackKey)) {
        return;
      }
      processedAckKeys.current.add(ackKey);
      setMetaAcked(true);
      setWindowBase(0);
      setVisibleSeq(0);
      setConfirmed(0);
      setLastAdvanceAt(Date.now());
      setLastAck("ACK META");
      setMessage(`ACK META recibido. Rotando ventana DATA 0-${Math.min(transfer.meta.total - 1, transferV2Config.windowSize - 1)}.`);
      return;
    }
    if (ack.ack !== "DATA" || !metaAcked) {
      return;
    }
    const totalPackets = transfer.meta.total;
    const nextExpected = clamp(ack.nextExpected, 0, totalPackets);
    if (nextExpected <= windowBase) {
      setLastAck(`ACK atrasado ${nextExpected}`);
      return;
    }
    setConfirmed(Math.max(ack.receivedCount, nextExpected));
    setWindowBase(nextExpected);
    setVisibleSeq(nextExpected < totalPackets ? nextExpected : Math.max(0, totalPackets - 1));
    setLastAdvanceAt(Date.now());
    setLastAck(`ACK hasta ${nextExpected - 1}`);
    if (nextExpected >= totalPackets) {
      setState("waiting_status");
      setVisibleSeq(Math.max(0, totalPackets - 1));
      setMessage("Todos los DATA confirmados. Esperando ACK DONE del receptor.");
      return;
    }
    setMessage(`ACK acumulativo recibido. Ventana DATA ${nextExpected}-${Math.min(totalPackets - 1, nextExpected + transferV2Config.windowSize - 1)}.`);
  }

  function backToSetup() {
    setTransfer(null);
    setConfirmed(0);
    setPaused(false);
    setCelebrate(false);
    setLastAck("Sin ACK");
    setLastSeen("Nada");
    setMetaAcked(false);
    setWindowBase(0);
    setVisibleSeq(0);
    setLastAdvanceAt(Date.now());
    setRetransmissions(0);
    processedAckKeys.current.clear();
    setState(preparedFile ? "showing_start" : "idle");
    setStage("setup");
  }

  const qrLabel =
    transfer && currentPacket ? (currentPacket.t === "DATA" ? `DATA ${currentPacket.seq + 1}/${total}` : currentPacket.t) : "QR emisor";

  const processInfo = {
    title: "Proceso emisor",
    progress: { completed: confirmed, total, label: "Enviando foto" },
    metrics: [
      { label: "Estado", value: labelForSenderState(state) },
      { label: "Enviados", value: sentCount },
      { label: "Confirmados", value: confirmed },
      { label: "Pendientes", value: pending },
      { label: "Total", value: total },
      { label: "QR actual", value: labelForPacket(currentPacket) },
      { label: "Último visto", value: lastSeen },
      { label: "Último ACK", value: lastAck },
      { label: "Versión", value: "2.0 ventana" },
      { label: "Ventana", value: transfer ? `${windowBase}-${windowEnd}` : "n/d" },
      { label: "Mostrando", value: metaAcked ? `DATA ${visibleSeq}` : labelForPacket(currentPacket) },
      { label: "Retransmisiones", value: retransmissions },
    ],
  };

  if (stage === "setup") {
    return (
      <div className="m-root">
        <AmbientBackground />
        <div className="m-setup">
          <div className="m-setup-header">
            <BackButton onClick={onBack} />
            <div className="m-setup-header-text">
              <span className="m-setup-title">Preparar envío</span>
              <span className="m-setup-subtitle">Elige calidad y foto antes de transmitir</span>
            </div>
          </div>

          <MotionView delay={60} className="m-setup-body">
            <div className="m-card">
              <span className="m-panel-title">Perfil de compresión</span>
              <span className="m-body">Menos calidad = menos QR = transferencia más rápida.</span>
              <SegmentedControl<CompressionProfileId>
                segments={compressionProfiles}
                value={profile.id}
                onChange={(id) => {
                  const next = compressionProfiles.find((item) => item.id === id);
                  if (next) {
                    setProfile(next);
                    setPreparedFile(null);
                    setState("idle");
                  }
                }}
                disabled={preparing}
              />
            </div>

            {preparedFile ? (
              <div className="m-card">
                <div className="m-preview">
                  <img className="m-preview-img" src={preparedFile.previewUrl} alt={preparedFile.fileName} />
                  <div className="m-preview-info">
                    <span className="m-preview-name">{preparedFile.fileName}</span>
                    <span className="m-body">
                      {formatBytes(preparedFile.originalSize)} → {formatBytes(preparedFile.compressedSize)}
                    </span>
                    <span className="m-body-muted">Hash {sha256Hex(preparedFile.bytes).slice(0, 10)}…</span>
                  </div>
                </div>
              </div>
            ) : null}

            {setupError ? <span className="m-error">{setupError}</span> : null}

            <Button
              label={preparing ? "Procesando…" : preparedFile ? "Cambiar foto" : "Seleccionar foto"}
              icon={preparing ? undefined : ImageIcon}
              variant={preparedFile ? "secondary" : "primary"}
              onClick={preparePhoto}
              disabled={preparing}
            />
            {preparing ? <div className="m-spinner" /> : null}
          </MotionView>

          <div className="m-setup-footer">
            <Button
              label="Continuar a la cámara"
              icon={ArrowRight}
              onClick={() => setStage("transfer")}
              disabled={!preparedFile || preparing}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <OpticalTransferDeck
        title="Enviar"
        onBack={backToSetup}
        state={state}
        message={message}
        warning="La foto se transfiere por QR óptico, sin red."
        cameraActive={state !== "done"}
        cameraTitle={transfer ? "Lee STATUS/DONE del receptor" : "Lee START del receptor"}
        cameraHint="Apunta al QR del otro móvil."
        onScanned={handleScan}
        qrValue={state !== "done" && transfer && currentPacket ? currentQr : ""}
        qrLabel={qrLabel}
        qrCaption={currentPacket ? "Manténlo visible hasta recibir ACK." : "Muestra este móvil al receptor."}
        qrPlaceholder="Esperando START del receptor. Cuando la cámara lo lea, aparecerán META y DATA."
        process={processInfo}
      >
        <div className="m-actions">
          <Button
            label={paused ? "Reanudar" : "Pausar"}
            icon={paused ? Play : Pause}
            variant="secondary"
            onClick={() => setPaused((value) => !value)}
            disabled={!transfer || state === "done"}
            className="m-action-btn"
          />
          <InlineSenderProgress state={state} confirmed={confirmed} total={total} lastSeen={lastSeen} lastAck={lastAck} />
        </div>
      </OpticalTransferDeck>

      <CompletionOverlay
        visible={celebrate}
        title="Transferencia completada"
        subtitle="El receptor confirmó la foto íntegra."
        onHidden={() => setCelebrate(false)}
      />
    </>
  );
}

function InlineSenderProgress({
  state,
  confirmed,
  total,
  lastSeen,
  lastAck,
}: {
  state: SenderState;
  confirmed: number;
  total: number;
  lastSeen: string;
  lastAck: string;
}) {
  const pct = total > 0 ? Math.round((Math.min(confirmed, total) / total) * 100) : 0;
  const remaining = Math.max(0, total - confirmed);
  const detail =
    total === 0
      ? `Esperando START · visto: ${lastSeen}`
      : state === "done"
        ? "Completado"
        : `${remaining} faltan · ${pct}% · V2 ${lastAck}`;
  return (
    <div className="m-inline-progress">
      <div className="m-inline-header">
        <span className="m-inline-label">Enviando foto</span>
        <span className="m-inline-value">{pct}%</span>
      </div>
      <div className="m-inline-track">
        <div className="m-inline-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="m-inline-detail">{detail}</span>
    </div>
  );
}

function keyForAck(ack: AckPacket): string {
  return `${ack.sid}:${ack.ack}:${ack.seq ?? "-"}:${ack.hashOk ? "ok" : ""}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatBytes(value: number | null): string {
  if (!value) {
    return "n/d";
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function labelForSenderState(state: SenderState): string {
  switch (state) {
    case "idle":
    case "showing_start":
      return "Esperando START";
    case "streaming_data":
      return "Esperando ACK";
    case "waiting_status":
      return "Esperando STATUS";
    case "repairing":
      return "Reparando";
    case "done":
      return "Completado";
    case "error":
      return "Error";
    default:
      return state;
  }
}

function labelForPacket(packet: TransferPacket | null): string {
  if (!packet) {
    return "Esperando START";
  }
  if (packet.t === "META") {
    return "META";
  }
  if (packet.t === "DATA") {
    return `DATA ${packet.seq}`;
  }
  return packet.t;
}
