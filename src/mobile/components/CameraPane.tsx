import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mobileColors } from "../theme";

type Props = {
  active: boolean;
  title: string;
  hint?: string;
  onScanned: (data: string) => void;
};

/**
 * Cámara que lee QR (vía @zxing/browser), réplica web del CameraScanner nativo.
 * Llena el panel con vista previa, marco de escaneo y selector de cámara.
 */
export function CameraPane({ active, title, hint, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef("");
  const lastAtRef = useRef(0);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function refreshDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const next = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setDevices(next);
      setSelectedDeviceId((current) => current || next[0]?.deviceId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron leer las cámaras");
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
        onScannedRef.current(value);
      })
      .then((next) => {
        controls = next;
        setError(null);
        void refreshDevices();
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : "No se pudo abrir la cámara";
        setError(window.isSecureContext ? message : "El navegador bloquea la cámara en HTTP. Abre por HTTPS o localhost.");
      });

    return () => {
      mounted = false;
      controls?.stop();
    };
  }, [active, selectedDeviceId]);

  return (
    <div className="m-camera">
      <video ref={videoRef} muted playsInline className="m-camera-video" />
      <div className="m-camera-chip">
        <Camera size={14} color={mobileColors.onPrimary} />
        <span>{title}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="m-scan-frame" aria-hidden="true">
        <i className="tl" />
        <i className="tr" />
        <i className="bl" />
        <i className="br" />
      </div>
      {devices.length > 1 ? (
        <div className="m-camera-select">
          <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {devices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Cámara ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? <p className="m-camera-error">{error}</p> : null}
    </div>
  );
}
