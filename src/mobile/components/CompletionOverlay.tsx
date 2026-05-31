import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { mobileColors } from "../theme";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onHidden?: () => void;
};

/** Aviso de éxito que aparece y desaparece solo, réplica de CompletionOverlay nativo. */
export function CompletionOverlay({ visible, title, subtitle, onHidden }: Props) {
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => onHiddenRef.current?.(), 1900);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="m-complete-backdrop">
      <div className="m-complete-card">
        <CheckCircle2 size={64} color={mobileColors.success} />
        <span className="m-complete-title">{title}</span>
        {subtitle ? <span className="m-complete-subtitle">{subtitle}</span> : null}
      </div>
    </div>
  );
}
