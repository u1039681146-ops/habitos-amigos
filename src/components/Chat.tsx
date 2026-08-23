import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { colorForIndex, uniqueInitials } from '../lib/colors';
import type { ChatMessage, Profile } from '../types';

const POLL_MS = 4000;

type Props = {
  profiles: Profile[];
  myUserId: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(d);
}

export default function Chat({ profiles, myUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const initialsById = uniqueInitials(profiles);

  function nameFor(userId: string) {
    return profiles.find((p) => p.id === userId)?.name || userId;
  }

  function colorFor(userId: string) {
    const idx = profiles.findIndex((p) => p.id === userId);
    return colorForIndex(idx < 0 ? 0 : idx);
  }

  async function load() {
    try {
      const res = await api.chat();
      setMessages(res.messages);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    try {
      await api.sendChat(value);
      await load();
    } catch (e) {
      setError((e as Error).message);
      setText(value);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="chat-messages">
        {loading && <p className="empty-state">Cargando…</p>}
        {!loading && messages.length === 0 && (
          <p className="empty-state">Aún no hay mensajes. ¡Escribe el primero!</p>
        )}
        {messages.map((m) => {
          const mine = m.userId === myUserId;
          return (
            <div className={`chat-row ${mine ? 'mine' : ''}`} key={m.id}>
              {!mine && (
                <span className="chat-avatar" style={{ background: colorFor(m.userId) }}>
                  {initialsById[m.userId] || '?'}
                </span>
              )}
              <div className="chat-bubble">
                {!mine && (
                  <div className="chat-sender" style={{ color: colorFor(m.userId) }}>
                    {nameFor(m.userId)}
                  </div>
                )}
                <div className="chat-text">{m.text}</div>
                <div className="chat-time">{formatTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={1000}
        />
        <button className="primary-btn" type="submit" disabled={!text.trim() || sending}>
          Enviar
        </button>
      </form>
    </div>
  );
}
