import type { Config } from '@netlify/functions';
import { generateAuthenticationOptions, generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';
import { getRPInfo, getUsers, json, setChallenge } from './_shared.js';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { userId, mode } = await req.json();
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return json({ error: 'Usuario no encontrado' }, { status: 404 });
  const { rpID } = getRPInfo(req);

  if (mode === 'register') {
    const options = await generateRegistrationOptions({
      rpName: 'Habitos entre amigos',
      rpID,
      userName: user.id,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        transports: pk.transports as AuthenticatorTransportFuture[] | undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });
    await setChallenge(user.id, 'register', options.challenge);
    return json(options);
  }

  if (mode === 'authenticate') {
    if (user.passkeys.length === 0) return json({ error: 'sin-passkey' }, { status: 409 });
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        transports: pk.transports as AuthenticatorTransportFuture[] | undefined,
      })),
    });
    await setChallenge(user.id, 'authenticate', options.challenge);
    return json(options);
  }

  return json({ error: 'modo invalido' }, { status: 400 });
};

export const config: Config = { path: '/api/webauthn-options' };
