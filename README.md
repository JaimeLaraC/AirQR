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

La primera vez el navegador mostrará un aviso de certificado autofirmado; acéptalo para desarrollo.

### Otros comandos

```bash
npm run build      # bundle de producción en dist/
npm run preview    # sirve el bundle ya generado
npm run typecheck  # comprobación de tipos con tsc
```

## Flujo rápido

1. Abre **Recibir Foto** en el dispositivo que recibirá la imagen.
2. Abre **Enviar Foto** en el otro dispositivo.
3. En el emisor selecciona una foto y pulsa `Comenzar a enviar`.
4. El emisor escanea el `START` del receptor con la webcam.
5. El emisor muestra `META` y espera `ACK META`.
6. Tras `ACK META`, el emisor rota `DATA` con una ventana de 4 fragmentos cada 180 ms.
7. El receptor lee esos QR y responde con `ACK DATA` acumulativo indicando `nextExpected`.
8. Si se pierde una lectura, el emisor repite la ventana desde la base.
9. El receptor reconstruye, valida el SHA-256, muestra `ACK DONE` y abre la imagen.

## Arquitectura

```
src/
├── App.tsx, main.tsx        # shell y enrutado (inicio / emisor / receptor)
├── screens/                 # SenderDesktop, ReceiverDesktop
├── components/              # webcam scanner, panel QR, progreso, toasts...
├── media/                   # compresión y descarga de imágenes
├── styles/                  # estilos globales
└── core/                    # núcleo independiente de la UI
    ├── config/              # parámetros de transferencia y perfiles de compresión
    ├── crypto/              # random, hashing, X25519, XChaCha20-Poly1305
    ├── protocol/            # paquetes, codificador/decodificador, checksums, sesión
    └── transfer/            # chunker, reparación, preparación del emisor y buffer del receptor
```

## Limitaciones

- La webcam del navegador puede enfocar peor que la cámara de un móvil.
- `window.open` puede ser bloqueado por políticas anti-popup del navegador.
- El rendimiento depende del brillo, la distancia, los reflejos, los FPS y el tamaño del QR.
- Se ejecuta en navegador (no es una app de escritorio nativa).

## Licencia

[MIT](LICENSE) © JaimeLaraC
