type Props = {
  state: string;
  message?: string;
  warning?: string;
};

const DONE_STATES = new Set(["done"]);
const ERROR_STATES = new Set(["error"]);
const ACTIVE_STATES = new Set([
  "streaming_data",
  "repairing",
  "waiting_status",
  "receiving_meta",
  "receiving_data",
  "reconstructing",
  "showing_status",
]);

const STATE_LABELS: Record<string, string> = {
  idle: "En espera",
  picking_file: "Seleccionando foto",
  preparing: "Preparando",
  showing_start: "Listo para enviar",
  streaming_data: "Emitiendo QR",
  waiting_status: "Esperando confirmación",
  repairing: "Reenviando faltantes",
  scanning_start: "Mostrando START",
  receiving_meta: "Recibiendo info",
  receiving_data: "Recibiendo QR",
  showing_status: "Enviando estado",
  reconstructing: "Reconstruyendo",
  validating: "Validando",
  done: "Completado",
  error: "Error",
};

function dotClass(state: string): string {
  if (ERROR_STATES.has(state)) {
    return "m-status-dot error";
  }
  if (DONE_STATES.has(state) || ACTIVE_STATES.has(state)) {
    return "m-status-dot active";
  }
  return "m-status-dot";
}

/** Bloque de estado de la transferencia (punto de color + mensaje), réplica de TransferStatus nativo. */
export function TransferStatus({ state, message, warning }: Props) {
  return (
    <div className="m-status">
      <div className="m-status-heading">
        <span className={dotClass(state)} />
        <span className="m-status-state">{STATE_LABELS[state] ?? state}</span>
      </div>
      {message ? <p className="m-status-message">{message}</p> : null}
      {warning ? <p className="m-status-warning">{warning}</p> : null}
    </div>
  );
}
