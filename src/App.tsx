import { useState } from "react";
import { Camera, ChevronRight, QrCode, Upload } from "lucide-react";
import { ReceiverDesktop } from "./screens/ReceiverDesktop";
import { SenderDesktop } from "./screens/SenderDesktop";
import "./styles/app.css";

type Route = "home" | "sender" | "receiver";

export function App() {
  const [route, setRoute] = useState<Route>("home");

  if (route === "sender") {
    return <SenderDesktop onBack={() => setRoute("home")} />;
  }

  if (route === "receiver") {
    return <ReceiverDesktop onBack={() => setRoute("home")} />;
  }

  return (
    <main className="desktop-home">
      <section className="home-stack">
        <div className="home-logo" aria-hidden="true">
          <QrCode size={46} strokeWidth={2.25} />
        </div>
        <h1>AirQR</h1>
        <p>Transferencia óptica offline</p>

        <div className="role-list" aria-label="Selecciona modo">
          <button className="role-card" onClick={() => setRoute("sender")}>
            <span className="role-icon">
              <Upload size={28} strokeWidth={2.25} />
            </span>
            <span className="role-copy">
              <strong>Enviar Foto</strong>
              <span>Selecciona una imagen y emítela por QR.</span>
            </span>
            <ChevronRight className="role-arrow" size={22} strokeWidth={2.5} />
          </button>

          <button className="role-card" onClick={() => setRoute("receiver")}>
            <span className="role-icon">
              <Camera size={28} strokeWidth={2.25} />
            </span>
            <span className="role-copy">
              <strong>Recibir Foto</strong>
              <span>Escanea los QR y reconstruye la imagen.</span>
            </span>
            <ChevronRight className="role-arrow" size={22} strokeWidth={2.5} />
          </button>
        </div>
      </section>
    </main>
  );
}
