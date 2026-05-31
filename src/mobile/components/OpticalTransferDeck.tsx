import { BarChart2, Info, QrCode } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AmbientBackground } from "./AmbientBackground";
import { BackButton } from "./BackButton";
import { CameraPane } from "./CameraPane";
import { Info3DPanel } from "./Info3DPanel";
import { ProcessPanel, type ProcessInfo } from "./ProcessPanel";
import { QRDisplay } from "./QRDisplay";
import { mobileColors } from "../theme";

type Props = {
  title: string;
  onBack: () => void;
  state: string;
  message: string;
  warning?: string;
  cameraActive: boolean;
  cameraTitle: string;
  cameraHint: string;
  onScanned: (data: string) => void;
  qrValue: string;
  qrLabel: string;
  qrCaption?: string;
  qrPlaceholder?: string;
  process?: ProcessInfo;
  children?: ReactNode;
};

/**
 * Estación óptica compartida por emisor y receptor: cámara arriba, QR abajo,
 * cabecera con paneles de estado/proceso. Réplica de OpticalTransferDeck nativo.
 */
export function OpticalTransferDeck(props: Props) {
  const {
    title,
    onBack,
    state,
    message,
    warning,
    cameraActive,
    cameraTitle,
    cameraHint,
    onScanned,
    qrValue,
    qrLabel,
    qrCaption,
    qrPlaceholder,
    process,
    children,
  } = props;
  const [infoOpen, setInfoOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const qrPaneRef = useRef<HTMLDivElement | null>(null);
  const [qrSize, setQrSize] = useState(220);

  useEffect(() => {
    const el = qrPaneRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const available = Math.min(rect.width - 40, rect.height - 52);
      setQrSize(Math.max(96, Math.min(340, Math.floor(available))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="m-root">
      <AmbientBackground />
      <div className="m-deck-root">
        <div className="m-deck-header">
          <BackButton onClick={onBack} />
          <span className="m-deck-title">{title}</span>
          {process ? (
            <button
              type="button"
              className={`m-icon-btn${processOpen ? " active" : ""}`}
              onClick={() => {
                setProcessOpen((value) => !value);
                setInfoOpen(false);
              }}
              aria-label="Proceso"
            >
              <BarChart2 size={21} color={processOpen ? mobileColors.onPrimary : mobileColors.label} />
            </button>
          ) : null}
          <button
            type="button"
            className={`m-icon-btn${infoOpen ? " active" : ""}`}
            onClick={() => {
              setInfoOpen((value) => !value);
              setProcessOpen(false);
            }}
            aria-label="Información"
          >
            <Info size={22} color={infoOpen ? mobileColors.onPrimary : mobileColors.label} />
          </button>
        </div>

        <div className="m-deck">
          <div className="m-pane m-pane-camera">
            <CameraPane active={cameraActive} title={cameraTitle} hint={cameraHint} onScanned={onScanned} />
          </div>

          <div className="m-pane m-pane-qr" ref={qrPaneRef}>
            {qrValue ? (
              <QRDisplay value={qrValue} label={qrLabel} caption={qrCaption} size={qrSize} showLabel={qrSize >= 116} />
            ) : (
              <div className="m-qr-placeholder">
                <QrCode size={40} color={mobileColors.tertiary} />
                <span className="m-qr-placeholder-title">QR pendiente</span>
                <span className="m-qr-placeholder-text">
                  {qrPlaceholder ?? "Apunta la cámara al QR del otro móvil para empezar."}
                </span>
              </div>
            )}
          </div>
        </div>

        {children ? <div className="m-controls">{children}</div> : null}

        <Info3DPanel visible={infoOpen} state={state} message={message} warning={warning} onClose={() => setInfoOpen(false)} />
        {process ? <ProcessPanel visible={processOpen} info={process} onClose={() => setProcessOpen(false)} /> : null}
      </div>
    </div>
  );
}
