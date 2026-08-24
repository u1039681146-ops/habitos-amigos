import type { Config } from '@netlify/functions';
import { getChatImage, json, randomId, saveChatImage, verifyToken } from './_shared.js';

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Falta id' }, { status: 400 });
    const image = await getChatImage(id);
    if (!image) return json({ error: 'Imagen no encontrada' }, { status: 404 });
    return new Response(image.data, {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (req.method === 'POST') {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
    const userId = verifyToken(token);
    if (!userId) return json({ error: 'No autorizado' }, { status: 401 });

    const contentType = req.headers.get('content-type') || '';
    if (!ALLOWED_TYPES.includes(contentType)) {
      return json({ error: 'Formato de imagen no soportado' }, { status: 400 });
    }
    const data = await req.arrayBuffer();
    if (data.byteLength === 0) return json({ error: 'Imagen vacía' }, { status: 400 });
    if (data.byteLength > MAX_BYTES) return json({ error: 'La imagen pesa demasiado (máx. 6MB)' }, { status: 400 });

    const id = randomId();
    await saveChatImage(id, data, contentType, userId);
    return json({ id });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const config: Config = { path: '/api/chat-image' };
