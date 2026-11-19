import http from 'node:http';
import { loadConfig } from './config.js';
import { handleVerification, handleIncoming } from './webhook.js';
import { ReminderStore } from './store.js';
import { createWhatsAppClient } from './whatsapp.js';
import { createMessageHandler } from './app.js';
import { startScheduler } from './scheduler.js';

const MAX_BODY_BYTES = 1024 * 1024;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, { status, body }) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

export function createServer({ config = loadConfig(), onMessage = async () => {} } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      }
      if (url.pathname === '/webhook' && req.method === 'GET') {
        return send(res, handleVerification(url, config.verifyToken));
      }
      if (url.pathname === '/webhook' && req.method === 'POST') {
        const rawBody = await readRawBody(req);
        const result = await handleIncoming({
          rawBody,
          signature: req.headers['x-hub-signature-256'],
          appSecret: config.appSecret,
          onMessage,
        });
        return send(res, result);
      }
      send(res, { status: 404, body: 'Not found' });
    } catch (err) {
      console.error('Error procesando petición:', err);
      if (!res.headersSent) send(res, { status: 500, body: 'Internal error' });
    }
  });
}

if (import.meta.main) {
  const config = loadConfig();
  const store = new ReminderStore(config.remindersFile);
  const client = createWhatsAppClient(config);
  const onMessage = createMessageHandler({ store, client });
  startScheduler({ store, client, intervalMs: config.schedulerIntervalMs });
  createServer({ config, onMessage }).listen(config.port, () => {
    console.log(`whatsapp-recordatorios escuchando en http://localhost:${config.port}`);
  });
}
