/**
 * Tokens de color de la app móvil ("AirQR Minimal Light"), espejo de
 * src/theme/theme.ts de la app nativa. Se usan donde hace falta un color en JS
 * (iconos lucide, QR); el resto del estilo vive en styles/mobile.css.
 */
export const mobileColors = {
  background: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E2E8F0",
  label: "#0F172A",
  secondary: "#64748B",
  tertiary: "#94A3B8",
  tint: "#0F172A",
  onPrimary: "#FFFFFF",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
} as const;

/** Colores del QR (igual que la app nativa: módulos casi negros sobre blanco). */
export const qrColors = {
  fg: "#111111",
  bg: "#ffffff",
} as const;
