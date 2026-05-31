import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  label: string;
  caption?: string;
};

const BOX_PADDING = 56;

export function QrPanel({ value, label, caption }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(200);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const available = Math.min(rect.width, rect.height) - BOX_PADDING;
      // El QR es cuadrado: usamos el lado menor para que nunca se recorte.
      setSize(Math.max(140, Math.min(420, Math.floor(available))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="qr-card">
      <div className="qr-card-head">
        <span>
          <QrCode size={20} />
          {label}
        </span>
        {caption ? <small>{caption}</small> : null}
      </div>
      {value ? (
        <div className="qr-box" ref={boxRef}>
          <div className="qr-white-shell">
            <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0f172a" marginSize={3} />
          </div>
        </div>
      ) : (
        <div className="empty-qr" ref={boxRef}>
          QR pendiente
        </div>
      )}
    </section>
  );
}
