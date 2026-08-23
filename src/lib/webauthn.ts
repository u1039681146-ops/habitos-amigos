import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { api, setSession } from './api';

export { browserSupportsWebAuthn, platformAuthenticatorIsAvailable };

export async function registerFaceId(userId: string) {
  const options = await api.webauthnOptions(userId, 'register');
  const attResp = await startRegistration(options);
  const result = await api.webauthnVerify(userId, 'register', attResp);
  setSession(result.token, userId);
  return result;
}

export async function authenticateFaceId(userId: string) {
  const options = await api.webauthnOptions(userId, 'authenticate');
  const authResp = await startAuthentication(options);
  const result = await api.webauthnVerify(userId, 'authenticate', authResp);
  setSession(result.token, userId);
  return result;
}
