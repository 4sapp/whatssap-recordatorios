import { isValidSignature } from './signature.js';

// GET /webhook: handshake de verificación de Meta.
export function handleVerification(url, verifyToken) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: 'Forbidden' };
}

// Extrae los mensajes de texto del payload de WhatsApp Cloud API.
export function extractTextMessages(payload) {
  const out = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const msg of change?.value?.messages ?? []) {
        if (msg.type === 'text' && msg.text?.body) {
          out.push({ id: msg.id, from: msg.from, text: msg.text.body, timestamp: Number(msg.timestamp) });
        }
      }
    }
  }
  return out;
}

// POST /webhook: valida firma, parsea y entrega cada mensaje a onMessage.
export async function handleIncoming({ rawBody, signature, appSecret, onMessage }) {
  if (!isValidSignature(rawBody, signature, appSecret)) {
    return { status: 401, body: 'Invalid signature' };
  }
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { status: 400, body: 'Invalid JSON' };
  }
  if (payload.object !== 'whatsapp_business_account') {
    return { status: 404, body: 'Not found' };
  }
  for (const message of extractTextMessages(payload)) {
    await onMessage(message);
  }
  // Meta reintenta si no recibe 200 rápido, así que se responde siempre 200 aquí.
  return { status: 200, body: 'EVENT_RECEIVED' };
}
