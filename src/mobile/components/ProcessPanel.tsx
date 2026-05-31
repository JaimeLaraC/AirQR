import { XCircle } from "lucide-react";
import { mobileColors } from "../theme";

export type ProcessMetric = {
  label: string;
  value: string | number;
};

export type ProcessInfo = {
  title: string;
  progress?: {
    completed: number;
    total: number;
    label?: string;
  };
  metrics: ProcessMetric[];
};

type Props = {
  visible: boolean;
  info: ProcessInfo;
  onClose: () => void;
};

/** Panel de proceso (progreso + métricas), réplica de ProcessPanel nativo. */
export function ProcessPanel({ visible, info, onClose }: Props) {
  const completed = info.progress?.completed ?? 0;
  const total = info.progress?.total ?? 0;
  const pct = total > 0 ? Math.round(Math.min(1, completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);

  return (
    <div className={`m-panel-wrap process${visible ? " open" : ""}`} aria-hidden={!visible}>
      <div className="m-panel-card">
        <div className="m-panel-header">
          <span className="m-panel-title">{info.title}</span>
          <button type="button" className="m-panel-close" onClick={onClose} aria-label="Cerrar">
            <XCircle size={26} color={mobileColors.tertiary} />
          </button>
        </div>

        {info.progress ? (
          <div className="m-progress-box">
            <div className="m-progress-header">
              <span className="m-progress-label">{info.progress.label ?? "Progreso"}</span>
              <span className="m-progress-value">{total > 0 ? `${pct}% · faltan ${remaining}` : "Esperando"}</span>
            </div>
            <div className="m-track">
              <div className="m-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}

        <div className="m-metrics">
          {info.metrics.map((metric) => (
            <div key={metric.label} className="m-metric">
              <div className="m-metric-value">{metric.value}</div>
              <div className="m-metric-label">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
