/**
 * Fondo ambiental estilo AirQR: manchas slate con degradado radial suave,
 * réplica del AmbientBackground nativo (react-native-svg) en SVG del DOM.
 */
export function AmbientBackground() {
  return (
    <div className="m-ambient" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="m-blob1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="m-blob2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="m-blob3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={10} cy={8} r={60} fill="url(#m-blob1)" />
        <circle cx={95} cy={85} r={70} fill="url(#m-blob2)" />
        <circle cx={70} cy={40} r={50} fill="url(#m-blob3)" />
      </svg>
    </div>
  );
}
