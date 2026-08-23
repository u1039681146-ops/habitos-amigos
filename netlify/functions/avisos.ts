import type { Config } from '@netlify/functions';
import {
  type AvisoResult,
  getCachedAviso,
  getEntriesForUser,
  getHabits,
  getUser,
  json,
  setCachedAviso,
  verifyToken,
} from './_shared.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WINDOW_DAYS = 7;

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isValidDateStr(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, { status: 405 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
  const userId = verifyToken(token);
  if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const todayParam = url.searchParams.get('today');
  const todayStr = isValidDateStr(todayParam) ? todayParam : toDateStr(new Date());
  const forceRefresh = url.searchParams.get('refresh') === '1';

  if (!forceRefresh) {
    const cached = await getCachedAviso(userId, todayStr);
    if (cached) return json(cached);
  }

  const [user, habits, entries] = await Promise.all([getUser(userId), getHabits(userId), getEntriesForUser(userId)]);
  if (!user) return json({ error: 'Usuario no encontrado' }, { status: 404 });

  const today = new Date(`${todayStr}T00:00:00Z`);
  const windowDates: string[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    windowDates.push(toDateStr(d));
  }

  const neglectedHabits = habits.filter(
    (h) => !entries.some((e) => e.habitId === h.id && e.done && windowDates.includes(e.date)),
  );

  let result: AvisoResult;
  const firstName = user.name.split(' ')[0];

  if (habits.length === 0) {
    result = { neglected: [], message: 'Todavía no tienes hábitos creados. Añade alguno desde el Diario para que pueda vigilarte.' };
  } else if (neglectedHabits.length === 0) {
    result = {
      neglected: [],
      message: `${firstName}, esta semana has cumplido con todos tus hábitos ni un solo día fallado. Eso no te da permiso para relajarte: mañana vuelve a currártelo igual. Stay hard.`,
    };
  } else {
    const neglectedList = neglectedHabits.map((h) => ({ id: h.id, name: h.name, emoji: h.emoji }));
    let message: string | null = null;
    if (OPENAI_API_KEY) {
      try {
        message = await generateGogginsMessage(firstName, neglectedHabits.map((h) => h.name));
      } catch {
        message = null;
      }
    }
    if (!message) {
      message = fallbackMessage(firstName, neglectedHabits.map((h) => `${h.emoji} ${h.name}`).join(', '));
    }
    result = { neglected: neglectedList, message };
  }

  await setCachedAviso(userId, todayStr, result);
  return json(result);
};

function fallbackMessage(name: string, habitList: string) {
  return `${name}, llevas ${WINDOW_DAYS} días sin tocar: ${habitList}. Nadie va a hacerlo por ti mientras pones excusas. Deja de mentirte y ponte hoy mismo.`;
}

async function generateGogginsMessage(name: string, habitNames: string[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un entrenador motivacional inspirado en el estilo de David Goggins: directo, exigente, sin ' +
            'excusas, hablas en español claro y sin rodeos. Eres duro y confrontas a la persona con el hecho ' +
            'de que ha fallado, para empujarla a retomarlo hoy mismo. No usas insultos degradantes, lenguaje ' +
            'de odio ni amenazas: la dureza es de exigencia y disciplina, no de desprecio. Responde solo con ' +
            'el mensaje, de 3 a 5 frases, sin emojis, sin saludos ni firmas.',
        },
        {
          role: 'user',
          content: `Escribe un mensaje para ${name}. Lleva al menos ${WINDOW_DAYS} días seguidos sin cumplir estos hábitos: ${habitNames.join(', ')}. Hazle ver que ha fallado y motívalo a retomarlo hoy mismo.`,
        },
      ],
      max_tokens: 220,
      temperature: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Respuesta vacía de OpenAI');
  return content;
}

export const config: Config = { path: '/api/avisos' };
