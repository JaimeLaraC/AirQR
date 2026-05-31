type Props = {
  title: string;
  total: number;
  sent?: number;
  confirmed?: number;
  received?: number;
  pending?: number;
  extra?: string;
};

export function ProgressPanel({ title, total, sent = 0, confirmed, received, pending, extra }: Props) {
  const completed = confirmed ?? received ?? sent;
  const ratio = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <section className="panel progress-panel">
      <h2>{title}</h2>
      <div className="bar">
        <span style={{ width: `${ratio}%` }} />
      </div>
      <div className="metrics">
        <Metric label="Enviados" value={sent} />
        {confirmed !== undefined ? <Metric label="Confirmados" value={confirmed} /> : null}
        {received !== undefined ? <Metric label="Recibidos" value={received} /> : null}
        {pending !== undefined ? <Metric label="Pendientes" value={pending} /> : null}
        <Metric label="Total" value={total} />
      </div>
      {extra ? <p className="muted">{extra}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
