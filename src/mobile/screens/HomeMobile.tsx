import { ArrowLeftRight, Camera, ChevronRight, QrCode, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AmbientBackground } from "../components/AmbientBackground";
import { MotionView } from "../components/MotionView";
import { mobileColors } from "../theme";

type Props = {
  onSender: () => void;
  onReceiver: () => void;
};

/** Pantalla de inicio móvil, réplica de HomeScreen de la app nativa. */
export function HomeMobile({ onSender, onReceiver }: Props) {
  return (
    <div className="m-root">
      <AmbientBackground />
      <main className="m-home">
        <div className="m-home-header">
          <MotionView fromScale={0.85} fromY={20}>
            <div className="m-logo-badge">
              <ArrowLeftRight size={44} color={mobileColors.label} strokeWidth={2} />
            </div>
          </MotionView>
          <MotionView delay={80}>
            <h1 className="m-title">AirQR</h1>
          </MotionView>
          <MotionView delay={140}>
            <p className="m-subtitle">
              Transferencia <span className="m-accent">offline</span> de imágenes mediante cámara y pantalla.
            </p>
          </MotionView>
        </div>

        <div className="m-cards">
          <MotionView delay={220} fromX={-24} fromY={0}>
            <RoleCard icon={QrCode} title="Enviar Foto" description="Emitir códigos QR animados" onClick={onSender} />
          </MotionView>
          <MotionView delay={300} fromX={24} fromY={0}>
            <RoleCard icon={Camera} title="Recibir Foto" description="Escanear con la cámara" onClick={onReceiver} />
          </MotionView>
        </div>

        <MotionView delay={420} className="m-footer">
          <div className="m-footer-row">
            <Smartphone size={14} color={mobileColors.tertiary} />
            <span className="m-footer-label">DOS DISPOSITIVOS NECESARIOS</span>
          </div>
          <p className="m-footer-text">
            Abre esta app en ambos dispositivos. Sin cuentas, sin Wi-Fi, transferencia 100% óptica.
          </p>
        </MotionView>
      </main>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="m-role-card" onClick={onClick}>
      <span className="m-role-badge">
        <Icon size={30} color={mobileColors.label} strokeWidth={2} />
      </span>
      <span className="m-role-text">
        <span className="m-role-title">{title}</span>
        <span className="m-role-desc">{description}</span>
      </span>
      <ChevronRight className="m-role-arrow" size={22} />
    </button>
  );
}
