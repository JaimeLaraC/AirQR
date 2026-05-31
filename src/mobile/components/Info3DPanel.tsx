import { XCircle } from "lucide-react";
import { TransferStatus } from "./TransferStatus";
import { mobileColors } from "../theme";

type Props = {
  visible: boolean;
  state: string;
  message: string;
  warning?: string;
  onClose: () => void;
};

/** Panel de estado que aparece con un efecto 3D (flip + fundido), réplica de Info3DPanel nativo. */
export function Info3DPanel({ visible, state, message, warning, onClose }: Props) {
  return (
    <div className={`m-panel-wrap info${visible ? " open" : ""}`} aria-hidden={!visible}>
      <div className="m-panel-card">
        <div className="m-panel-header">
          <span className="m-panel-title">Estado de la transferencia</span>
          <button type="button" className="m-panel-close" onClick={onClose} aria-label="Cerrar">
            <XCircle size={26} color={mobileColors.tertiary} />
          </button>
        </div>
        <TransferStatus state={state} message={message} warning={warning} />
        <p className="m-panel-hint">
          Cámara arriba: apunta al QR del otro móvil · QR abajo: muéstralo al otro móvil.
        </p>
      </div>
    </div>
  );
}
