import { useState } from "react";
import { HomeMobile } from "./screens/HomeMobile";
import { ReceiverMobile } from "./screens/ReceiverMobile";
import "./styles/mobile.css";

type Route = "home" | "sender" | "receiver";

/**
 * Raíz de la interfaz móvil (réplica de la app nativa). Enruta entre inicio,
 * emisor y receptor. La transferencia usa el protocolo AirQR 2.0 (ventana).
 */
export function MobileApp() {
  const [route, setRoute] = useState<Route>("home");

  if (route === "receiver") {
    return <ReceiverMobile onBack={() => setRoute("home")} />;
  }

  return <HomeMobile onSender={() => setRoute("sender")} onReceiver={() => setRoute("receiver")} />;
}
