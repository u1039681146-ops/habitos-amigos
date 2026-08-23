import { useEffect, useState } from 'react';
import { api, setSession } from '../lib/api';
import { SERIES_COLORS, uniqueInitials } from '../lib/colors';
import { authenticateFaceId, browserSupportsWebAuthn, registerFaceId } from '../lib/webauthn';
import type { Profile } from '../types';

// TEMPORAL: la verificacion con Face ID esta desactivada mientras se define
// el resto de la app. Poner en true para volver a pedir Face ID al entrar.
const REQUIRE_FACE_ID = false;

const AVATAR_PHOTOS: Record<string, string> = {
  jose: '/avatars/jose.png',
  tomas: '/avatars/tomas.png',
  izan: '/avatars/izan.png',
  marco: '/avatars/marco.png',
  leiva: '/avatars/leiva.png',
};

const AVATAR_POSITION: Record<string, string> = {
  tomas: 'center 10%',
};

type Props = {
  onAuthenticated: (userId: string) => void;
  compact?: boolean;
};

export default function Login({ onAuthenticated, compact }: Props) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .profiles()
      .then((data) => setProfiles(data.users))
      .catch(() => setLoadError('No se pudo cargar la lista de perfiles.'));
  }, []);

  async function handleTap(profile: Profile) {
    if (pendingId) return;
    setError(null);
    setPendingId(profile.id);
    try {
      if (!REQUIRE_FACE_ID) {
        const result = await api.selectProfile(profile.id);
        setSession(result.token, profile.id);
        onAuthenticated(profile.id);
        return;
      }
      if (browserSupportsWebAuthn && !browserSupportsWebAuthn()) {
        throw new Error('Este navegador no soporta Face ID / Touch ID (WebAuthn).');
      }
      if (profile.hasPasskey) {
        await authenticateFaceId(profile.id);
      } else {
        await registerFaceId(profile.id);
      }
      onAuthenticated(profile.id);
    } catch (e) {
      const err = e as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        setError('Se canceló la verificación. Inténtalo de nuevo.');
      } else {
        setError(err.message || 'No se pudo verificar tu identidad.');
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className={compact ? 'profile-picker' : 'login-screen'}>
      {!compact && (
        <>
          <h1>Hábitos entre amigos</h1>
          <p className="subtitle">Elige tu perfil para entrar</p>
        </>
      )}

      {loadError && <div className="login-error">{loadError}</div>}

      {profiles && (
        <div className="profile-grid">
          {(() => {
            const initialsById = uniqueInitials(profiles);
            return profiles.map((p, i) => (
            <button
              key={p.id}
              className={`profile-tile tile-${(i % SERIES_COLORS.length) + 1}`}
              disabled={pendingId !== null}
              onClick={() => handleTap(p)}
            >
              {REQUIRE_FACE_ID && <span className="faceid-badge">🔒</span>}
              {AVATAR_PHOTOS[p.id] ? (
                <img
                  className="profile-photo"
                  src={AVATAR_PHOTOS[p.id]}
                  alt={p.name}
                  style={AVATAR_POSITION[p.id] ? { objectPosition: AVATAR_POSITION[p.id] } : undefined}
                />
              ) : (
                <span className="initials">{initialsById[p.id]}</span>
              )}
              <span className="name">{p.name}</span>
              {pendingId === p.id && (
                <span className="tile-overlay">
                  <span className="spinner" />
                  {REQUIRE_FACE_ID ? (p.hasPasskey ? 'Verificando Face ID…' : 'Configurando Face ID…') : 'Entrando…'}
                </span>
              )}
            </button>
            ));
          })()}
        </div>
      )}

      {error && <div className="login-error">{error}</div>}

      {REQUIRE_FACE_ID && (
        <p className="hint-text">
          La primera vez que entras se configura Face ID / Touch ID en este dispositivo para tu
          perfil. Las siguientes veces solo tendrás que verificarte para entrar.
        </p>
      )}
    </div>
  );
}
