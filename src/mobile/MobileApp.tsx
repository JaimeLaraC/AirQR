import { useState } from "react";
import { AmbientBackground } from "./components/AmbientBackground";
import { MotionView } from "./components/MotionView";
import "./styles/mobile.css";

type Route = "home" | "sender" | "receiver";

/**
 * Raíz de la interfaz móvil (réplica de la app nativa). Enruta entre inicio,
 * emisor y receptor. La transferencia usa el protocolo AirQR 2.0 (ventana).
 */
export function MobileApp() {
  const [route, setRoute] = useState<Route>("home");

  // Las pantallas se conectan en las siguientes features (home/deck/sender/receiver).
  return (
    <div className="m-root">
      <AmbientBackground />
      <main className="m-home">
        <MotionView className="m-home-header" fromScale={0.85} fromY={20}>
          <h1 className="m-title">AirQR</h1>
        </MotionView>
        <p className="m-subtitle">Cargando interfaz móvil…</p>
        {/* route placeholder */}
        <span hidden>{route}</span>
        <button type="button" hidden onClick={() => setRoute("home")} />
      </main>
    </div>
  );
}
