import type { Config } from '@netlify/functions';
import { getEntries, getHabits, getUsers, json } from './_shared.js';

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// El dashboard es de lectura publica: se muestra en el inicio antes de
// iniciar sesion, asi que no exige token.
export default async (req: Request) => {
  const url = new URL(req.url);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days') || 14)));

  const [users, habits, entries] = await Promise.all([getUsers(), getHabits(), getEntries()]);

  const today = new Date();
  const dateList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateList.push(toDateStr(d));
  }

  const totalHabits = habits.length;
  const todayStr = toDateStr(today);

  const perUser = users.map((u) => {
    const dayStats = dateList.map((date) => {
      const completed = entries.filter((e) => e.userId === u.id && e.date === date && e.done).length;
      const pct = totalHabits > 0 ? completed / totalHabits : 0;
      return { date, completed, total: totalHabits, pct };
    });

    let streak = 0;
    for (let i = dayStats.length - 1; i >= 0; i--) {
      if (totalHabits > 0 && dayStats[i].pct >= 1) streak++;
      else break;
    }

    const todayInfo = dayStats.find((d) => d.date === todayStr) || { date: todayStr, completed: 0, total: totalHabits, pct: 0 };

    return {
      id: u.id,
      name: u.name,
      hasPasskey: u.passkeys.length > 0,
      days: dayStats,
      streak,
      today: todayInfo,
    };
  });

  return json({ dateList, habits, users: perUser });
};

export const config: Config = { path: '/api/dashboard' };
