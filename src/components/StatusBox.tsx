type Props = {
  state: string;
  message: string;
  warning?: string;
};

// Paridad con src/components/TransferStatus.tsx (app móvil).
const STATE_LABELS: Record<string, string> = {
  idle: "En espera",
  ready: "Listo para enviar",
  preparing: "Preparando",
  showing_start: "Listo para enviar",
  streaming_data: "Emitiendo QR",
  waiting_status: "Esperando confirmación",
  waiting_done: "Esperando confirmación",
  repairing: "Reenviando faltantes",
  scanning_start: "Mostrando START",
  receiving_meta: "Recibiendo info",
  receiving_data: "Recibiendo QR",
  showing_status: "Mostrando STATUS",
  reconstructing: "Reconstruyendo",
  validating: "Validando",
  repair: "Reenviando faltantes",
  done: "Completado",
  error: "Error",
};

const ACTIVE_STATES = new Set([
  "preparing",
  "streaming_data",
  "scanning_start",
  "receiving_meta",
  "receiving_data",
  "reconstructing",
  "validating",
  "showing_status",
  "waiting_status",
  "waiting_done",
  "repairing",
  "repair",
]);

export function StatusBox({ state, message, warning }: Props) {
  const label = STATE_LABELS[state] ?? state;
  const dotColor =
    state === "error"
      ? "var(--danger)"
      : state === "done"
        ? "var(--success)"
        : ACTIVE_STATES.has(state)
          ? "var(--success)"
          : "var(--tertiary)";

  return (
    <section className="status-box">
      <div className="status-head">
        <span className="status-dot" style={{ backgroundColor: dotColor }} />
        <strong>{label}</strong>
      </div>
      <span>{message}</span>
      {warning ? <em>{warning}</em> : null}
    </section>
  );
}
