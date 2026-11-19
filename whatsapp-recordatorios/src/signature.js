import crypto from 'node:crypto';

// Valida la cabecera X-Hub-Signature-256 que envía Meta:
//   "sha256=" + HMAC-SHA256(rawBody, APP_SECRET) en hexadecimal.
// Se debe calcular sobre el cuerpo crudo (Buffer), no sobre el JSON re-serializado.
export function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || typeof signatureHeader !== 'string') return false;
  const [algo, received] = signatureHeader.split('=');
  if (algo !== 'sha256' || !received) return false;

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  // timingSafeEqual lanza si las longitudes difieren, así que se comprueba antes.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
