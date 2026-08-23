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

// Negocio/proyecto de cada uno, para que el aviso lo saque a relucir de vez
// en cuando (no siempre) y pegue más fuerte al conectar el hábito fallado
// con lo que se juega en su curro.
const PROJECTS: Record<string, string> = {
  marco: 'una consultoría en la que escala comunidades de Skool',
  leiva: 'un negocio que provee impresión 3D para otras empresas (B2B)',
  izan: 'una marca de ropa llamada Gymkrack que quiere hacer crecer mucho, junto a José',
  jose: 'una marca de ropa llamada Gymkrack que quiere hacer crecer mucho, junto a Izan',
  tomas: 'una agencia de IA que ofrece automatizaciones, chatbots y servicios de IA',
};
const PROJECT_MENTION_CHANCE = 0.35;

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
    const perfectWeek = habits.every((h) =>
      windowDates.every((date) => entries.some((e) => e.habitId === h.id && e.date === date && e.done)),
    );
    let message: string | null = null;
    if (OPENAI_API_KEY) {
      try {
        const mentionProject = Math.random() < PROJECT_MENTION_CHANCE ? PROJECTS[userId] : undefined;
        message = await generatePraiseMessage(firstName, habits.map((h) => h.name), perfectWeek, mentionProject);
      } catch {
        message = null;
      }
    }
    if (!message) {
      message = perfectWeek
        ? `${firstName}, semana perfecta: ni un solo hábito fallado ni un solo día. Eso es disciplina de verdad. No te relajes ahora, esto es solo el principio. Stay hard.`
        : `${firstName}, esta semana no has fallado ningún hábito del todo, algo has hecho de cada uno. Bien. Pero "algo" no es lo mismo que "todo": aprieta más. Stay hard.`;
    }
    result = { neglected: [], message };
  } else {
    const neglectedList = neglectedHabits.map((h) => ({ id: h.id, name: h.name, emoji: h.emoji }));
    let message: string | null = null;
    if (OPENAI_API_KEY) {
      try {
        const mentionProject = Math.random() < PROJECT_MENTION_CHANCE ? PROJECTS[userId] : undefined;
        message = await generateGogginsMessage(firstName, neglectedHabits.map((h) => h.name), mentionProject);
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

async function generatePraiseMessage(
  name: string,
  habitNames: string[],
  perfectWeek: boolean,
  project?: string,
): Promise<string> {
  const projectLine = project
    ? ` Su proyecto es: ${project}. Menciónalo de forma natural, conectando la disciplina en sus hábitos con cómo eso también se nota en su negocio (sin exagerar, una sola vez).`
    : '';
  const situacion = perfectWeek
    ? `Ha cumplido TODOS estos hábitos TODOS los días de la última semana, sin fallar ninguno: ${habitNames.join(', ')}.`
    : `Lleva la última semana cumpliendo, sin dejar ninguno del todo abandonado, estos hábitos: ${habitNames.join(', ')}.`;
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
            'Eres un entrenador exigente inspirado en David Goggins. Cuando alguien SÍ ha cumplido, se lo ' +
            'reconoces de verdad y con respeto, en español: no es un cumplido blando ni cursi, es el ' +
            'reconocimiento duro de quien exige mucho y sabe lo que cuesta el esfuerzo. Aun así nunca te ' +
            'relajas del todo: cierras dejando claro que esto no da margen para bajar el ritmo, que la ' +
            'disciplina de hoy es la mínima de mañana. Puedes usar alguna palabra malsonante suave si encaja ' +
            'de forma natural, sin pasarte. Responde solo con el mensaje, de 3 a 5 frases, sin emojis, sin ' +
            'saludos ni firmas.',
        },
        {
          role: 'user',
          content: `Escribe un mensaje para ${name}. ${situacion} Reconócele el esfuerzo de verdad y exígele que mantenga el nivel.${projectLine}`,
        },
      ],
      max_tokens: 220,
      temperature: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Respuesta vacía de OpenAI');
  return content;
}

function fallbackMessage(name: string, habitList: string) {
  return `${name}, ${WINDOW_DAYS} días sin tocar: ${habitList}. Ni un día. Deja de mentirte, deja las excusas de mierda, y ponte HOY. Nadie va a hacerlo por ti.`;
}

async function generateGogginsMessage(name: string, habitNames: string[], project?: string): Promise<string> {
  const projectLine = project
    ? ` Su proyecto es: ${project}. Menciónalo de forma natural, conectando el hábito fallado con lo que se está jugando en su negocio si sigue así (sin exagerar ni forzarlo, una sola vez).`
    : '';
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
            'Eres un entrenador brutalmente agresivo inspirado en David Goggins: grita en texto, sin filtros, ' +
            'sin paños calientes, en español. No consuelas ni justificas: le echas en cara sin piedad que ha ' +
            'fallado, usas frases cortas y contundentes tipo mazazo, mayúsculas puntuales para énfasis, y ' +
            'puedes usar tacos moderados en español (joder, cojones, coño) como remate. Cero comprensión, ' +
            'cero excusas aceptadas. Aun así: nunca insultas su identidad (nada sobre su físico, familia, ' +
            'origen, orientación, etc.), nunca usas lenguaje de odio ni amenazas de ningún tipo — la agresividad ' +
            'es sobre su falta de disciplina y sus excusas, no sobre quién es. Responde solo con el mensaje, de ' +
            '3 a 5 frases, sin emojis, sin saludos ni firmas.',
        },
        {
          role: 'user',
          content: `Escribe un mensaje para ${name}. Lleva al menos ${WINDOW_DAYS} días seguidos sin cumplir estos hábitos: ${habitNames.join(', ')}. Machácale por haber fallado y exígele que lo retome hoy mismo, sin compasión.${projectLine}`,
        },
      ],
      max_tokens: 220,
      temperature: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Respuesta vacía de OpenAI');
  return content;
}

export const config: Config = { path: '/api/avisos' };
