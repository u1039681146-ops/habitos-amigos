import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes } from 'node:crypto';

export type User = {
  id: string;
  name: string;
  pinHash?: string;
};

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  createdBy?: string;
};

export type Entry = {
  userId: string;
  date: string; // YYYY-MM-DD
  habitId: string;
  done: boolean;
  updatedAt: string;
};

export type DiaryNote = {
  userId: string;
  date: string;
  note: string;
  updatedAt: string;
};

// El roster de amigos es fijo, asi que vive en el codigo. El pinHash de
// cada uno se guarda por separado (clave user:<id>) para que crear/cambiar
// el PIN de una persona nunca pise el de otra que se guarda a la vez.
const ROSTER: { id: string; name: string }[] = [
  { id: 'tomas', name: 'Tomás Rodicio' },
  { id: 'jose', name: 'José Pernas' },
  { id: 'izan', name: 'Izan Martínez' },
  { id: 'marco', name: 'Marco Laporta' },
  { id: 'leiva', name: 'Marco Leiva' },
];

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
};

const DEFAULT_HABITS: Habit[] = [
  { id: 'ejercicio', name: 'Ejercicio', emoji: '🏋️' },
  { id: 'leer', name: 'Leer', emoji: '📖' },
  { id: 'agua', name: 'Beber agua', emoji: '💧' },
  { id: 'dormir', name: 'Dormir bien', emoji: '🌙' },
  { id: 'meditar', name: 'Meditar', emoji: '🧘' },
];

function store() {
  return getStore('habitos');
}

type UserRecord = { pinHash?: string };

export async function getUsers(): Promise<User[]> {
  const s = store();
  return Promise.all(
    ROSTER.map(async (u) => {
      const rec = (await s.get(`user:${u.id}`, { type: 'json' })) as UserRecord | null;
      return { ...u, pinHash: rec?.pinHash };
    }),
  );
}

export async function getUser(id: string): Promise<User | null> {
  const base = ROSTER.find((u) => u.id === id);
  if (!base) return null;
  const rec = (await store().get(`user:${id}`, { type: 'json' })) as UserRecord | null;
  return { ...base, pinHash: rec?.pinHash };
}

export async function setUserPinHash(id: string, pinHash: string) {
  await store().setJSON(`user:${id}`, { pinHash });
}

export async function getHabits(): Promise<Habit[]> {
  const s = store();
  const data = await s.get('habits', { type: 'json' });
  if (!data) {
    await s.setJSON('habits', DEFAULT_HABITS);
    return DEFAULT_HABITS;
  }
  return data as Habit[];
}

export async function saveHabits(habits: Habit[]) {
  await store().setJSON('habits', habits);
}

export async function getEntries(): Promise<Entry[]> {
  const data = await store().get('entries', { type: 'json' });
  return (data as Entry[]) || [];
}

export async function saveEntries(entries: Entry[]) {
  await store().setJSON('entries', entries);
}

export async function getNotes(): Promise<DiaryNote[]> {
  const data = await store().get('notes', { type: 'json' });
  return (data as DiaryNote[]) || [];
}

export async function saveNotes(notes: DiaryNote[]) {
  await store().setJSON('notes', notes);
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  const data = await store().get('chat', { type: 'json' });
  return (data as ChatMessage[]) || [];
}

export async function saveChatMessages(messages: ChatMessage[]) {
  await store().setJSON('chat', messages);
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';

export function hashPin(userId: string, pin: string): string {
  return createHmac('sha256', SESSION_SECRET).update(`${userId}:${pin}`).digest('base64url');
}

export function issueToken(userId: string): string {
  const expiry = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 dias
  const payload = `${userId}.${expiry}`;
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, expiryStr, sig] = decoded.split('.');
    const expiry = Number(expiryStr);
    if (!userId || !expiry || Number.isNaN(expiry)) return null;
    if (Date.now() > expiry) return null;
    const payload = `${userId}.${expiry}`;
    const expectedSig = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;
    return userId;
  } catch {
    return null;
  }
}

export function randomId(): string {
  return randomBytes(9).toString('base64url');
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
