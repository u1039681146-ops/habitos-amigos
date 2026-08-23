import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes } from 'node:crypto';

export type Passkey = {
  credentialID: string;
  credentialPublicKey: string; // base64
  counter: number;
  transports?: string[];
};

export type User = {
  id: string;
  name: string;
  passkeys: Passkey[];
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

const DEFAULT_USERS: User[] = [
  { id: 'tomas', name: 'Tomás Rodicio', passkeys: [] },
  { id: 'jose', name: 'José Pernas', passkeys: [] },
  { id: 'izan', name: 'Izan Martínez', passkeys: [] },
  { id: 'marco', name: 'Marco Laporta', passkeys: [] },
  { id: 'leiva', name: 'Marco Leiva', passkeys: [] },
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

export async function getUsers(): Promise<User[]> {
  const s = store();
  const data = (await s.get('users', { type: 'json' })) as User[] | null;
  if (!data) {
    await s.setJSON('users', DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  // Rellena amigos nuevos anadidos a DEFAULT_USERS que aun no esten guardados.
  const existingIds = new Set(data.map((u) => u.id));
  const missing = DEFAULT_USERS.filter((u) => !existingIds.has(u.id));
  if (missing.length > 0) {
    const merged = [...data, ...missing];
    await s.setJSON('users', merged);
    return merged;
  }
  return data;
}

export async function saveUsers(users: User[]) {
  await store().setJSON('users', users);
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

export async function getChallenge(userId: string, kind: string): Promise<string | null> {
  const data = await store().get(`challenge:${kind}:${userId}`, { type: 'text' });
  return data || null;
}

export async function setChallenge(userId: string, kind: string, challenge: string) {
  await store().set(`challenge:${kind}:${userId}`, challenge);
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';

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

export function getRPInfo(req: Request) {
  const url = new URL(req.url);
  const rpID = url.hostname;
  const origin = url.origin;
  return { rpID, origin };
}
