import { QRCodeSVG } from "qrcode.react";
import { qrColors } from "../theme";

type Props = {
  value: string;
  label: string;
  caption?: string;
  size?: number;
  showLabel?: boolean;
};

/** QR con etiqueta y pie, réplica de QRDisplay nativo (react-native-qrcode-svg → qrcode.react). */
export function QRDisplay({ value, label, caption, size = 240, showLabel = true }: Props) {
  return (
    <div className="m-qr-wrap">
      {showLabel ? <span className="m-qr-label">{label}</span> : null}
      <div className="m-qr-box">
        <QRCodeSVG value={value || " "} size={size} bgColor={qrColors.bg} fgColor={qrColors.fg} level="L" marginSize={2} />
      </div>
      {caption ? <span className="m-qr-caption">{caption}</span> : null}
    </div>
  );
}
