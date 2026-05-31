import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  /** Desplazamiento inicial en px. */
  fromY?: number;
  fromX?: number;
  /** Escala inicial (1 = sin escala). */
  fromScale?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Entrada animada tipo framer-motion (fundido + desplazamiento + escala),
 * réplica web del MotionView nativo usando una animación CSS.
 */
export function MotionView({ children, delay = 0, fromY = 16, fromX = 0, fromScale = 1, className, style }: Props) {
  const vars = {
    "--m-from-x": `${fromX}px`,
    "--m-from-y": `${fromY}px`,
    "--m-from-scale": String(fromScale),
    animationDelay: `${delay}ms`,
  } as CSSProperties;

  return (
    <div className={`m-motion${className ? ` ${className}` : ""}`} style={{ ...vars, ...style }}>
      {children}
    </div>
  );
}
