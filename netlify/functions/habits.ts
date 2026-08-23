import type { Config } from '@netlify/functions';
import { getHabits, json, randomId, saveHabits, verifyToken } from './_shared.js';

export default async (req: Request) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  if (req.method === 'GET') {
    const habits = await getHabits(userId);
    return json({ habits });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const habits = await getHabits(userId);
    if (body.action === 'add') {
      const name = String(body.name || '').trim();
      if (!name) return json({ error: 'Nombre requerido' }, { status: 400 });
      const habit = { id: randomId(), name, emoji: body.emoji || '✅', createdBy: userId };
      habits.push(habit);
      await saveHabits(userId, habits);
      return json({ habits });
    }
    if (body.action === 'remove') {
      const next = habits.filter((h) => h.id !== body.id);
      await saveHabits(userId, next);
      return json({ habits: next });
    }
    if (body.action === 'reorder') {
      const order: unknown[] = Array.isArray(body.order) ? body.order : [];
      const byId = new Map(habits.map((h) => [h.id, h]));
      const reordered = order.filter((id): id is string => typeof id === 'string' && byId.has(id)).map((id) => byId.get(id)!);
      const missing = habits.filter((h) => !reordered.includes(h));
      const next = [...reordered, ...missing];
      await saveHabits(userId, next);
      return json({ habits: next });
    }
    return json({ error: 'accion invalida' }, { status: 400 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const config: Config = { path: '/api/habits' };
