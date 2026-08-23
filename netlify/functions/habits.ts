import type { Config } from '@netlify/functions';
import { getHabits, json, randomId, saveHabits, verifyToken } from './_shared.js';

export default async (req: Request) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  if (req.method === 'GET') {
    const habits = await getHabits();
    return json({ habits });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const habits = await getHabits();
    if (body.action === 'add') {
      const name = String(body.name || '').trim();
      if (!name) return json({ error: 'Nombre requerido' }, { status: 400 });
      const habit = { id: randomId(), name, emoji: body.emoji || '✅', createdBy: userId };
      habits.push(habit);
      await saveHabits(habits);
      return json({ habits });
    }
    if (body.action === 'remove') {
      const next = habits.filter((h) => h.id !== body.id);
      await saveHabits(next);
      return json({ habits: next });
    }
    return json({ error: 'accion invalida' }, { status: 400 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const config: Config = { path: '/api/habits' };
