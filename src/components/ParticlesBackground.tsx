// PRNG determinista (mulberry32): mismo patrón de puntos siempre, sin
// recalcular posiciones aleatorias en cada render.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = ['#2a78d6', '#6da7ec', '#9ec5f4', '#cde2fb', '#8a8f98', '#c7ccd3'];

type Dot = { id: number; x: number; y: number; size: number; color: string; opacity: number };

function generateDots(count: number, seed: number): Dot[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: rand() * 100,
    y: rand() * 100,
    size: 2 + rand() * 8,
    color: COLORS[Math.floor(rand() * COLORS.length)],
    opacity: 0.2 + rand() * 0.5,
  }));
}

const DOTS = generateDots(200, 42);

export default function ParticlesBackground() {
  return (
    <div className="particles-bg" aria-hidden="true">
      {DOTS.map((d) => (
        <span
          key={d.id}
          className="particle-dot"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}
