const TOKEN_KEY = 'habitos.token';
const USER_KEY = 'habitos.userId';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId() {
  return localStorage.getItem(USER_KEY);
}

export function setSession(token: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, userId);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  profiles: () => request('/api/profiles'),
  pin: (userId: string, action: 'set' | 'verify', pin: string) =>
    request('/api/pin', { method: 'POST', body: JSON.stringify({ userId, action, pin }) }),
  habits: () => request('/api/habits'),
  addHabit: (name: string, emoji: string) =>
    request('/api/habits', { method: 'POST', body: JSON.stringify({ action: 'add', name, emoji }) }),
  removeHabit: (id: string) =>
    request('/api/habits', { method: 'POST', body: JSON.stringify({ action: 'remove', id }) }),
  entriesForDate: (date: string) => request(`/api/entries?date=${date}`),
  toggleEntry: (date: string, habitId: string, done: boolean) =>
    request('/api/entries', { method: 'POST', body: JSON.stringify({ action: 'toggle', date, habitId, done }) }),
  saveNote: (date: string, note: string) =>
    request('/api/entries', { method: 'POST', body: JSON.stringify({ action: 'note', date, note }) }),
  dashboard: (days = 14, today?: string) =>
    request(`/api/dashboard?days=${days}${today ? `&today=${today}` : ''}`),
  chat: () => request('/api/chat'),
  sendChat: (text: string) => request('/api/chat', { method: 'POST', body: JSON.stringify({ text }) }),
  avisos: (today: string, refresh = false) => request(`/api/avisos?today=${today}${refresh ? '&refresh=1' : ''}`),
};
