import type { Config } from '@netlify/functions';
import { verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';
import { getChallenge, getRPInfo, getUsers, issueToken, json, saveUsers } from './_shared.js';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { userId, mode, response } = await req.json();
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return json({ error: 'Usuario no encontrado' }, { status: 404 });
  const { rpID, origin } = getRPInfo(req);

  if (mode === 'register') {
    const expectedChallenge = await getChallenge(user.id, 'register');
    if (!expectedChallenge) return json({ error: 'El codigo ha caducado, intentalo de nuevo' }, { status: 400 });
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: 'No se pudo verificar Face ID' }, { status: 400 });
    }
    const info = verification.registrationInfo;
    user.passkeys.push({
      credentialID: info.credentialID,
      credentialPublicKey: Buffer.from(info.credentialPublicKey).toString('base64'),
      counter: info.counter,
      transports: (response.response?.transports as string[] | undefined) || [],
    });
    await saveUsers(users);
    const token = issueToken(user.id);
    return json({ verified: true, token });
  }

  if (mode === 'authenticate') {
    const expectedChallenge = await getChallenge(user.id, 'authenticate');
    if (!expectedChallenge) return json({ error: 'El codigo ha caducado, intentalo de nuevo' }, { status: 400 });
    const passkey = user.passkeys.find((pk) => pk.credentialID === response.id);
    if (!passkey) return json({ error: 'Credencial no reconocida' }, { status: 400 });
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: passkey.credentialID,
        credentialPublicKey: new Uint8Array(Buffer.from(passkey.credentialPublicKey, 'base64')),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
      },
    });
    if (!verification.verified) {
      return json({ error: 'No se pudo verificar Face ID' }, { status: 400 });
    }
    passkey.counter = verification.authenticationInfo.newCounter;
    await saveUsers(users);
    const token = issueToken(user.id);
    return json({ verified: true, token });
  }

  return json({ error: 'modo invalido' }, { status: 400 });
};

export const config: Config = { path: '/api/webauthn-verify' };
