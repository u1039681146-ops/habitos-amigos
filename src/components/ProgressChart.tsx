type Point = { date: string; pct: number };

type Props = { points: Point[] };

const W = 640;
const H = 240;
const MARGIN = { top: 16, right: 16, bottom: 40, left: 46 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function shortDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(d);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// Curva suave (Catmull-Rom -> Bézier) que pasa por cada punto, en vez de
// unirlos con segmentos rectos: con pocos puntos y valores que suben y
// bajan de golpe, la línea recta en zigzag queda muy angulosa y fea.
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, MARGIN.top, MARGIN.top + PLOT_H);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6, MARGIN.top, MARGIN.top + PLOT_H);
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function ProgressChart({ points }: Props) {
  if (points.length < 2) {
    return <p className="empty-state">Marca hábitos unos días más para ver tu progreso aquí.</p>;
  }

  const n = points.length;
  const xFor = (i: number) => MARGIN.left + (i / (n - 1)) * PLOT_W;
  const yFor = (pct: number) => MARGIN.top + (1 - pct) * PLOT_H;
  const baseline = MARGIN.top + PLOT_H;

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.pct) }));
  const linePath = smoothPath(coords);
  const areaPath = `${linePath} L ${coords[n - 1].x},${baseline} L ${coords[0].x},${baseline} Z`;
  const last = coords[n - 1];

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="progress-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="progress-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--status-good)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--status-good)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="progress-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7cd394" />
          <stop offset="100%" stopColor="var(--status-good)" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => (
        <g key={t}>
          <line x1={MARGIN.left} y1={yFor(t)} x2={W - MARGIN.right} y2={yFor(t)} className="progress-gridline" />
          <text x={MARGIN.left - 8} y={yFor(t)} className="progress-tick progress-tick-y">
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}

      <text x={MARGIN.left} y={baseline + 22} className="progress-tick progress-tick-x">
        {shortDate(points[0].date)}
      </text>
      <text x={W - MARGIN.right} y={baseline + 22} className="progress-tick progress-tick-x progress-tick-x-end">
        {shortDate(points[n - 1].date)}
      </text>

      <text x={16} y={MARGIN.top + PLOT_H / 2} className="progress-axis-title" transform={`rotate(-90 16 ${MARGIN.top + PLOT_H / 2})`}>
        Hábitos
      </text>
      <text x={MARGIN.left + PLOT_W / 2} y={H - 4} className="progress-axis-title progress-axis-title-x">
        Tiempo
      </text>

      <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={baseline} className="progress-axis" />
      <line x1={MARGIN.left} y1={baseline} x2={W - MARGIN.right} y2={baseline} className="progress-axis" />

      <path d={areaPath} fill="url(#progress-fill)" stroke="none" />
      <path d={linePath} className="progress-line" stroke="url(#progress-stroke)" />
      <circle cx={last.x} cy={last.y} r="3.5" className="progress-dot" />
    </svg>
  );
}
