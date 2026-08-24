type Point = { date: string; pct: number };

type Props = { points: Point[] };

const W = 600;
const H = 160;
const PAD = 6;

export default function ProgressChart({ points }: Props) {
  if (points.length < 2) {
    return <p className="empty-state">Marca hábitos unos días más para ver tu progreso aquí.</p>;
  }

  const n = points.length;
  const xFor = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const yFor = (pct: number) => PAD + (1 - pct) * (H - PAD * 2);
  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.pct)}`).join(' ');

  return (
    <svg className="progress-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="progress-axis" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="progress-axis" />
      <polyline points={linePoints} className="progress-line" />
    </svg>
  );
}
