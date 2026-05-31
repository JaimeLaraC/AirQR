# AirQR

Transferencia óptica de fotos **offline** entre dos dispositivos mediante códigos QR. La foto no
viaja por la red: se codifica en una secuencia de QR que un dispositivo muestra en pantalla y el
otro lee con la cámara/webcam. La red solo se usa para cargar la aplicación en desarrollo.

AirQR implementa el protocolo **AirQR 2.0**: una "ventana TCP óptica" de 4 fragmentos con ACK
acumulativo, cifrado de la imagen y verificación de integridad con SHA-256.

## Características

- Emisor y receptor en la misma aplicación (React + Vite).
- Núcleo propio en `src/core`: protocolo, criptografía y motor de transferencia.
- Cifrado de la imagen con XChaCha20-Poly1305 e intercambio de claves X25519 + HKDF.
- Integridad verificada con CRC-32 por fragmento y SHA-256 del fichero completo.
- Lector de QR por webcam con selector de cámara (frontal, trasera o cualquier webcam).
- Panel QR que rota los fragmentos con ventana de 4 y 180 ms por QR.
- Registro tipo terminal en el receptor y panel de progreso en tiempo real.

## Requisitos

- Node.js 18+ y npm.
- Un navegador con permiso de cámara.

## Ejecutar

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`) y concede permiso de cámara.

Si lo abres desde un móvil por IP local o Tailscale, usa HTTPS para que el navegador permita la
cámara:

```bash
npm run dev:https
```

