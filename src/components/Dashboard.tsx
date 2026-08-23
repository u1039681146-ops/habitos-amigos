import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { todayStr } from '../lib/date';
import type { DashboardData } from '../types';

const SEQ_STEPS = ['#e1e0d9', '#d3f0da', '#a8e2b8', '#7cd394', '#4fc072', '#2fa354', '#1f7a3c', '#0f4d24'];

function heatColor(pct: number) {
  if (pct <= 0) return SEQ_STEPS[0];
  const idx = Math.min(SEQ_STEPS.length - 1, 1 + Math.floor(pct * (SEQ_STEPS.length - 2)));
  return SEQ_STEPS[idx];
}

function dayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getDate();
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard(30, todayStr())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="empty-state">Cargando…</p>;

  return (
    <div>
      <p className="section-title">Últimos 30 días</p>
      <div className="heatmap-wrap">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th></th>
              {data.dateList.map((d) => (
                <th key={d} title={d}>
                  {dayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td className="row-label">{u.name}</td>
                {u.days.map((day) => (
                  <td key={day.date}>
                    <div
                      className="heat-cell"
                      style={{ background: heatColor(day.pct) }}
                      title={`${day.date}: ${day.completed}/${day.total} hábitos`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="heat-legend">
          <span>Menos</span>
          {SEQ_STEPS.map((c) => (
            <div className="heat-cell" style={{ background: c }} key={c} />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}
