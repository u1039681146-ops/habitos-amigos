import { useState } from 'react';

const DIGIT_LETTERS: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
};

type Props = {
  name: string;
  subtitle: string;
  error?: string | null;
  shakeToken: number;
  busy?: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
};

export default function PinPad({ name, subtitle, error, shakeToken, busy, onSubmit, onCancel }: Props) {
  const [digits, setDigits] = useState<string[]>([]);

  function press(d: string) {
    if (busy || digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join('');
      setTimeout(() => setDigits([]), 120);
      onSubmit(pin);
    }
  }

  function backspace() {
    if (busy) return;
    setDigits((d) => d.slice(0, -1));
  }

  return (
    <div className="pin-overlay">
      <div className="pin-sheet">
        <button className="pin-back" onClick={onCancel} type="button">
          ‹ Atrás
        </button>

        <div className="pin-header">
          <div className="pin-name">{name}</div>
          <div className="pin-subtitle">{subtitle}</div>
        </div>

        <div className={`pin-dots ${shakeToken > 0 ? 'shake' : ''}`} key={shakeToken}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${digits.length > i ? 'filled' : ''}`} />
          ))}
        </div>
        <div className="pin-error-slot">{error && <span className="pin-error">{error}</span>}</div>

        <div className="pin-keypad">
          {Object.entries(DIGIT_LETTERS).map(([digit, letters]) => (
            <button key={digit} className="pin-key" type="button" disabled={busy} onClick={() => press(digit)}>
              <span className="pin-key-digit">{digit}</span>
              {letters && <span className="pin-key-letters">{letters}</span>}
            </button>
          ))}
          <span className="pin-key pin-key-ghost" aria-hidden="true" />
          <button className="pin-key" type="button" disabled={busy} onClick={() => press('0')}>
            <span className="pin-key-digit">0</span>
          </button>
          <button
            className="pin-key pin-key-back"
            type="button"
            disabled={busy || digits.length === 0}
            onClick={backspace}
            aria-label="Borrar"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
