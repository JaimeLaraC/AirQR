import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  active: boolean;
  title: string;
  hint?: string;
  onScanned: (data: string) => void;
};

export function WebcamScanner({ active, title, hint, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef("");
  const lastAtRef = useRef(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function refreshDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setError("Este navegador no permite enumerar cámaras.");
        return;
      }
      const nextDevices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
      setDevices(nextDevices);
      setSelectedDeviceId((current) => current || nextDevices[0]?.deviceId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron leer las cámaras disponibles");
    }
  }

  useEffect(() => {
    void refreshDevices();
  }, []);

  useEffect(() => {
    if (!active || !videoRef.current) {
      return;
    }

    let mounted = true;
    let controls: IScannerControls | null = null;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });

    reader
      .decodeFromVideoDevice(selectedDeviceId || undefined, videoRef.current, (result) => {
        if (!result || !mounted) {
          return;
        }
        const value = result.getText();
        const now = Date.now();
        if (value === lastValueRef.current && now - lastAtRef.current < 450) {
          return;
        }
        lastValueRef.current = value;
        lastAtRef.current = now;
        onScanned(value);
      })
      .then((nextControls) => {
        controls = nextControls;
        setError(null);
        void refreshDevices();
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : "No se pudo abrir la cámara";
        setError(
          window.isSecureContext
            ? message
            : "El navegador bloquea la cámara en HTTP. Abre la app por HTTPS o en localhost.",
        );
      });

    return () => {
      mounted = false;
      controls?.stop();
    };
  }, [active, onScanned, selectedDeviceId]);

  return (
    <section className="camera-card">
      <div className="camera-stage">
        <video ref={videoRef} muted playsInline className="video" />
        <div className="camera-label">
          <span>
            <Camera size={16} />
            {title}
          </span>
          {hint ? <small>{hint}</small> : null}
        </div>
        <div className="scan-frame" aria-hidden="true">
          <i className="tl" />
          <i className="tr" />
          <i className="bl" />
          <i className="br" />
        </div>
        <div className="camera-controls">
          <label>
            Cámara
            <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
              {devices.length === 0 ? <option value="">Cámara predeterminada</option> : null}
              {devices.map((device, index) => (
                <option key={device.deviceId || index} value={device.deviceId}>
                  {device.label || `Cámara ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="small-icon-button" onClick={() => void refreshDevices()} aria-label="Actualizar cámaras">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
