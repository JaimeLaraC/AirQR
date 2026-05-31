import { useState } from "react";
import { HomeMobile } from "./screens/HomeMobile";
import "./styles/mobile.css";

type Route = "home" | "sender" | "receiver";

/**
 * Raíz de la interfaz móvil (réplica de la app nativa). Enruta entre inicio,
 * emisor y receptor. La transferencia usa el protocolo AirQR 2.0 (ventana).
 */
export function MobileApp() {
  const [route, setRoute] = useState<Route>("home");

  if (route === "sender") {
    // SenderMobile se conecta en la feature del emisor.
  }
  if (route === "receiver") {
    // ReceiverMobile se conecta en la feature del receptor.
  }

  return <HomeMobile onSender={() => setRoute("sender")} onReceiver={() => setRoute("receiver")} />;
}
