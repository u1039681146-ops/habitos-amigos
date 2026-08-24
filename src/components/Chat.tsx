import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { colorForIndex, uniqueInitials } from '../lib/colors';
import type { ChatMessage, Profile } from '../types';

const POLL_MS = 4000;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

type Props = {
  profiles: Profile[];
  myUserId: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(d);
}

// Redimensiona y comprime la foto en el propio navegador antes de subirla:
// una foto de móvil sin tocar puede pesar varios MB, esto lo deja ligero.
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

export default function Chat({ profiles, myUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploadingImage) return;
    if (!file.type.startsWith('image/')) {
      setError('Ese archivo no es una imagen.');
      return;
    }
    setUploadingImage(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const imageId = await api.uploadChatImage(compressed);
      await api.sendChat('', imageId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingImage(false);
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
                {m.imageId && (
                  <img
                    className="chat-image"
                    src={`/api/chat-image?id=${m.imageId}`}
                    alt=""
                    loading="lazy"
                    onClick={() => setPreviewImageId(m.imageId!)}
                  />
                )}
                {m.text && <div className="chat-text">{m.text}</div>}
                <div className="chat-time">{formatTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        {uploadingImage && (
          <div className="chat-row mine">
            <div className="chat-bubble chat-bubble-uploading">Subiendo foto…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} hidden />
        <button
          type="button"
          className="chat-photo-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploadingImage}
          aria-label="Enviar foto"
          title="Enviar foto"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path
              d="M4 8.5h3.2l1.4-2.2a1.6 1.6 0 0 1 1.35-.8h4.1a1.6 1.6 0 0 1 1.35.8l1.4 2.2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19v-9A1.5 1.5 0 0 1 4 8.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="14" r="3.4" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="17.6" cy="11.4" r="0.9" fill="currentColor" />
          </svg>
        </button>
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

      {previewImageId && (
        <div className="image-preview-overlay" onClick={() => setPreviewImageId(null)}>
          <button
            className="image-preview-close"
            onClick={() => setPreviewImageId(null)}
            aria-label="Cerrar foto"
          >
            ✕
          </button>
          <img
            className="image-preview-img"
            src={`/api/chat-image?id=${previewImageId}`}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
