import type { Config } from '@netlify/functions';
import { getUser, hashPin, issueToken, json, setUserPinHash } from './_shared.js';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { userId, action, pin } = await req.json();
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return json({ error: 'El PIN debe tener 4 dígitos' }, { status: 400 });
  }
  const user = await getUser(userId);
  if (!user) return json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (action === 'set') {
    if (user.pinHash) return json({ error: 'Este perfil ya tiene un PIN' }, { status: 409 });
    await setUserPinHash(user.id, hashPin(user.id, pin));
    return json({ token: issueToken(user.id) });
  }

  if (action === 'verify') {
    if (!user.pinHash) return json({ error: 'sin-pin' }, { status: 409 });
    if (user.pinHash !== hashPin(user.id, pin)) return json({ error: 'PIN incorrecto' }, { status: 401 });
    return json({ token: issueToken(user.id) });
  }

  return json({ error: 'accion invalida' }, { status: 400 });
};

export const config: Config = { path: '/api/pin' };
