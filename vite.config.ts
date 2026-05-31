import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// En producción la app se publica en GitHub Pages bajo /AirQR/.
// En desarrollo se sirve desde la raíz (/).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/AirQR/" : "/",
  plugins: [react(), ...(process.env.VITE_HTTPS === "1" ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
  },
}));
