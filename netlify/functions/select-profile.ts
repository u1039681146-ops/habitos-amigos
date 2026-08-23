import type { Config } from '@netlify/functions';
// TEMPORAL: acceso directo sin verificacion de identidad.
// Cuando se active Face ID de nuevo, este endpoint se puede retirar
// y el login volvera a pasar por webauthn-options / webauthn-verify.
import { getUsers, issueToken, json } from './_shared.js';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { userId } = await req.json();
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return json({ error: 'Usuario no encontrado' }, { status: 404 });
  const token = issueToken(user.id);
  return json({ token });
};

export const config: Config = { path: '/api/select-profile' };
