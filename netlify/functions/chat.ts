import type { Config } from '@netlify/functions';
import { getChatMessages, json, randomId, saveChatMessages, verifyToken } from './_shared.js';

const MAX_STORED = 500;
const MAX_RETURNED = 200;

export default async (req: Request) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  if (req.method === 'GET') {
    const messages = await getChatMessages();
    return json({ messages: messages.slice(-MAX_RETURNED) });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const text = String(body.text || '').trim().slice(0, 1000);
    if (!text) return json({ error: 'Mensaje vacío' }, { status: 400 });

    const messages = await getChatMessages();
    const message = { id: randomId(), userId, text, createdAt: new Date().toISOString() };
    messages.push(message);
    if (messages.length > MAX_STORED) messages.splice(0, messages.length - MAX_STORED);
    await saveChatMessages(messages);
    return json({ message });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const config: Config = { path: '/api/chat' };
