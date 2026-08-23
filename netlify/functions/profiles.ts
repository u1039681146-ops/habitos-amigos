import type { Config } from '@netlify/functions';
import { getUsers, json } from './_shared.js';

export default async (_req: Request) => {
  const users = await getUsers();
  return json({ users: users.map((u) => ({ id: u.id, name: u.name, hasPasskey: u.passkeys.length > 0 })) });
};

export const config: Config = { path: '/api/profiles' };
