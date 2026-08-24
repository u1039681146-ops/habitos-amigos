type Point = { date: string; pct: number };

type Props = { points: Point[] };

const W = 640;
const H = 240;
const MARGIN = { top: 14, right: 14, bottom: 40, left: 46 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function shortDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(d);
}

export default function ProgressChart({ points }: Props) {
  if (points.length < 2) {
    return <p className="empty-state">Marca hábitos unos días más para ver tu progreso aquí.</p>;
  }

  const n = points.length;
  const xFor = (i: number) => MARGIN.left + (i / (n - 1)) * PLOT_W;
  const yFor = (pct: number) => MARGIN.top + (1 - pct) * PLOT_H;

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.pct)}`).join(' ');
  const areaPoints = `${xFor(0)},${MARGIN.top + PLOT_H} ${linePoints} ${xFor(n - 1)},${MARGIN.top + PLOT_H}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="progress-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="progress-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--status-good)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--status-good)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={MARGIN.left}
            y1={yFor(t)}
            x2={W - MARGIN.right}
            y2={yFor(t)}
            className="progress-gridline"
          />
          <text x={MARGIN.left - 8} y={yFor(t)} className="progress-tick progress-tick-y">
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}

      <text x={MARGIN.left} y={MARGIN.top + PLOT_H + 22} className="progress-tick progress-tick-x">
        {shortDate(points[0].date)}
      </text>
      <text x={W - MARGIN.right} y={MARGIN.top + PLOT_H + 22} className="progress-tick progress-tick-x progress-tick-x-end">
        {shortDate(points[n - 1].date)}
      </text>

      <text
        x={16}
        y={MARGIN.top + PLOT_H / 2}
        className="progress-axis-title"
        transform={`rotate(-90 16 ${MARGIN.top + PLOT_H / 2})`}
      >
        Hábitos
      </text>
      <text x={MARGIN.left + PLOT_W / 2} y={H - 4} className="progress-axis-title progress-axis-title-x">
        Tiempo
      </text>

      <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + PLOT_H} className="progress-axis" />
      <line
        x1={MARGIN.left}
        y1={MARGIN.top + PLOT_H}
        x2={W - MARGIN.right}
        y2={MARGIN.top + PLOT_H}
        className="progress-axis"
      />

      <polygon points={areaPoints} fill="url(#progress-fill)" stroke="none" />
      <polyline points={linePoints} className="progress-line" />
    </svg>
  );
}
