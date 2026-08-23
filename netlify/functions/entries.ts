import type { Config } from '@netlify/functions';
import { getEntriesForUser, getNotesForUser, json, saveEntriesForUser, saveNotesForUser, verifyToken } from './_shared.js';

export default async (req: Request) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const entries = await getEntriesForUser(userId);
    const notes = await getNotesForUser(userId);
    if (date) {
      return json({
        entries: entries.filter((e) => e.date === date),
        note: notes.find((n) => n.date === date)?.note || '',
      });
    }
    return json({ entries, notes });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const now = new Date().toISOString();

    if (body.action === 'toggle') {
      const entries = await getEntriesForUser(userId);
      const idx = entries.findIndex((e) => e.date === body.date && e.habitId === body.habitId);
      if (idx >= 0) {
        entries[idx].done = body.done;
        entries[idx].updatedAt = now;
      } else {
        entries.push({ userId, date: body.date, habitId: body.habitId, done: body.done, updatedAt: now });
      }
      await saveEntriesForUser(userId, entries);
      return json({ ok: true });
    }

    if (body.action === 'note') {
      const notes = await getNotesForUser(userId);
      const idx = notes.findIndex((n) => n.date === body.date);
      if (idx >= 0) {
        notes[idx].note = body.note;
        notes[idx].updatedAt = now;
      } else {
        notes.push({ userId, date: body.date, note: body.note, updatedAt: now });
      }
      await saveNotesForUser(userId, notes);
      return json({ ok: true });
    }

    return json({ error: 'accion invalida' }, { status: 400 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const config: Config = { path: '/api/entries' };
