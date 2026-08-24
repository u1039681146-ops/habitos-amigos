import type { Config } from '@netlify/functions';
import { getEntriesForUser, getHabits, json, verifyToken } from './_shared.js';

const MAX_DAYS = 365;

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isValidDateStr(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Progreso personal de cumplimiento (% de hábitos hechos por día) desde el
// primer día con actividad registrada hasta hoy, para la gráfica del
// Dashboard cuando estás dentro de tu propio perfil.
export default async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const todayParam = url.searchParams.get('today');
  const todayStr = isValidDateStr(todayParam) ? todayParam : toDateStr(new Date());

  const [habits, entries] = await Promise.all([getHabits(userId), getEntriesForUser(userId)]);
  const totalHabits = habits.length;

  if (totalHabits === 0 || entries.length === 0) {
    return json({ points: [] });
  }

  // Igual que en el dashboard: las marcas de habitos ya borrados no deben
  // seguir sumando, o el % no cuadra con la lista de habitos actual.
  const habitIds = new Set(habits.map((h) => h.id));

  let firstDate = entries[0].date;
  for (const e of entries) {
    if (e.date < firstDate) firstDate = e.date;
  }

  const start = new Date(`${firstDate}T00:00:00Z`);
  const end = new Date(`${todayStr}T00:00:00Z`);

  const points: { date: string; pct: number }[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = toDateStr(d);
    const completed = entries.filter((e) => e.date === dateStr && e.done && habitIds.has(e.habitId)).length;
    points.push({ date: dateStr, pct: completed / totalHabits });
  }

  const trimmed = points.length > MAX_DAYS ? points.slice(points.length - MAX_DAYS) : points;
  return json({ points: trimmed });
};

export const config: Config = { path: '/api/progress' };
