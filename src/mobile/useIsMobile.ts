import { useEffect, useState } from "react";

const QUERY = "(max-width: 820px), (pointer: coarse)";

function evaluate(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/**
 * Decide si mostrar la interfaz móvil (réplica de la app nativa) en lugar de la
 * de escritorio. Es reactivo: cambia al redimensionar la ventana o girar el móvil.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(evaluate);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const list = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
