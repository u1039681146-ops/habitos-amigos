import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { todayStr } from '../lib/date';

type AvisoResult = {
  message: string;
  neglected: { id: string; name: string; emoji: string }[];
};

export default function Avisos() {
  const [aviso, setAviso] = useState<AvisoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh: boolean) {
    if (refresh) setRefreshing(true);
    try {
      const res = await api.avisos(todayStr(), refresh);
      setAviso(res);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="empty-state">Cargando…</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!aviso) return null;

  const hasNeglected = aviso.neglected.length > 0;

  return (
    <div className="avisos-panel">
      <div className={`aviso-card ${hasNeglected ? 'critical' : 'good'}`}>
        <div className="aviso-label">{hasNeglected ? 'Sin excusas' : 'Stay hard'}</div>
        <p className="aviso-message">{aviso.message}</p>
        {hasNeglected && (
          <div className="aviso-habits">
            {aviso.neglected.map((h) => (
              <span className="aviso-habit-chip" key={h.id}>
                {h.emoji} {h.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <button className="aviso-refresh" type="button" onClick={() => load(true)} disabled={refreshing}>
        {refreshing ? 'Generando…' : 'Generar de nuevo'}
      </button>
    </div>
  );
}
