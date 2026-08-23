import { useEffect, useState } from 'react';
import { api, setSession } from '../lib/api';
import { SERIES_COLORS, uniqueInitials } from '../lib/colors';
import PinPad from './PinPad';
import type { Profile } from '../types';

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

type PinStep = 'verify' | 'create' | 'confirm';

export default function Login({ onAuthenticated, compact }: Props) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [pinStep, setPinStep] = useState<PinStep>('verify');
  const [pendingPin, setPendingPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [shakeToken, setShakeToken] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .profiles()
      .then((data) => setProfiles(data.users))
      .catch(() => setLoadError('No se pudo cargar la lista de perfiles.'));
  }, []);

  function openPinPad(profile: Profile) {
    setActiveProfile(profile);
    setPinStep(profile.hasPin ? 'verify' : 'create');
    setPendingPin(null);
    setPinError(null);
  }

  function closePinPad() {
    setActiveProfile(null);
    setPendingPin(null);
    setPinError(null);
  }

  function failAttempt(message: string, resetToStep: PinStep) {
    setPinError(message);
    setShakeToken((t) => t + 1);
    setPinStep(resetToStep);
    setPendingPin(null);
  }

  async function handlePinSubmit(pin: string) {
    if (!activeProfile) return;
    setPinError(null);

    if (pinStep === 'verify') {
      setBusy(true);
      try {
        const result = await api.pin(activeProfile.id, 'verify', pin);
        setSession(result.token, activeProfile.id);
        onAuthenticated(activeProfile.id);
      } catch {
        failAttempt('PIN incorrecto. Inténtalo de nuevo.', 'verify');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (pinStep === 'create') {
      setPendingPin(pin);
      setPinStep('confirm');
      return;
    }

    // confirm
    if (pin !== pendingPin) {
      failAttempt('Los PIN no coinciden. Vuelve a crearlo.', 'create');
      return;
    }
    setBusy(true);
    try {
      const result = await api.pin(activeProfile.id, 'set', pin);
      setSession(result.token, activeProfile.id);
      onAuthenticated(activeProfile.id);
    } catch {
      failAttempt('No se pudo guardar el PIN. Inténtalo de nuevo.', 'create');
    } finally {
      setBusy(false);
    }
  }

  const pinSubtitle =
    pinStep === 'verify' ? 'Introduce tu PIN' : pinStep === 'create' ? 'Crea un PIN de 4 dígitos' : 'Confirma tu PIN';

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
                onClick={() => openPinPad(p)}
              >
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
              </button>
            ));
          })()}
        </div>
      )}

      {activeProfile && (
        <PinPad
          name={activeProfile.name}
          subtitle={pinSubtitle}
          error={pinError}
          shakeToken={shakeToken}
          busy={busy}
          onSubmit={handlePinSubmit}
          onCancel={closePinPad}
        />
      )}
    </div>
  );
}
