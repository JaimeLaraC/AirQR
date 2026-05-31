import { Download, Share2, X } from "lucide-react";

type Props = {
  visible: boolean;
  uri: string | null;
  fileName: string;
  hashOk?: boolean;
  canShare: boolean;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
};

/** Visor a pantalla completa de la foto recibida, réplica de ReceivedImageViewer nativo. */
export function ReceivedImageViewer({ visible, uri, fileName, hashOk, canShare, onClose, onSave, onShare }: Props) {
  if (!visible || !uri) {
    return null;
  }
  return (
    <div className="m-viewer" role="dialog" aria-modal="true">
      <div className="m-viewer-header">
        <div>
          <div className="m-viewer-title">Foto recibida</div>
          {hashOk ? <div className="m-viewer-subtitle">Hash verificado · íntegra</div> : null}
        </div>
        <button type="button" className="m-viewer-close" onClick={onClose} aria-label="Cerrar">
          <X size={30} />
        </button>
      </div>

      <img className="m-viewer-image" src={uri} alt={fileName} />

      <div className="m-viewer-actions">
        <button type="button" className="m-btn" onClick={onSave}>
          <Download size={18} />
          <span>Guardar</span>
        </button>
        {canShare ? (
          <button type="button" className="m-btn" onClick={onShare}>
            <Share2 size={18} />
            <span>Compartir</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
