import { ChevronLeft } from "lucide-react";

/** Botón circular de volver estilo AirQR. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="m-back-btn" onClick={onClick} aria-label="Volver">
      <ChevronLeft size={24} />
    </button>
  );
}
