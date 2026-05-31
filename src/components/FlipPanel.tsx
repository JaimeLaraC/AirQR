import type { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function FlipPanel({ open, title, onClose, children }: Props) {
  return (
    <div className={`flip-overlay${open ? " open" : ""}`} aria-hidden={!open} onClick={onClose}>
      <div className="flip-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="flip-header">
          <h2>{title}</h2>
          <button className="icon-button ghost" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flip-body">{children}</div>
      </div>
    </div>
  );
}
