import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

type Variant = "primary" | "secondary" | "plain";

type Props = {
  label: string;
  onClick: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Botón estilo AirQR (pastilla), réplica del Button nativo. */
export function Button({ label, onClick, variant = "primary", icon: Icon, disabled = false, className, style }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`m-btn m-btn-${variant}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {Icon ? <Icon size={18} /> : null}
      <span>{label}</span>
    </button>
  );
}
