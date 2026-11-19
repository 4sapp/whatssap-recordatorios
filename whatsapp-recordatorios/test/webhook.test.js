import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from '../src/server.js';
import { isValidSignature } from '../src/signature.js';

const APP_SECRET = 'secreto-de-prueba';
const config = { verifyToken: 'tok', appSecret: APP_SECRET };

const sign = (body) => 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');

const payload = (text) => JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ value: { messages: [
    { id: 'wamid.1', from: '34600000000', timestamp: '1700000000', type: 'text', text: { body: text } },
  ] } }] }],
});

async function withServer(onMessage, fn) {
  const server = createServer({ config, onMessage }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://localhost:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('isValidSignature acepta firma correcta y rechaza incorrecta', () => {
  const body = Buffer.from('{"a":1}');
  assert.equal(isValidSignature(body, sign(body), APP_SECRET), true);
  assert.equal(isValidSignature(body, 'sha256=deadbeef', APP_SECRET), false);
  assert.equal(isValidSignature(body, undefined, APP_SECRET), false);
  assert.equal(isValidSignature(body, sign(body), ''), false);
});

test('GET /webhook devuelve el challenge con token correcto y 403 si no', async () => {
  await withServer(undefined, async (base) => {
    const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=123`);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), '123');
    const bad = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=123`);
    assert.equal(bad.status, 403);
  });
});

test('POST /webhook con firma válida entrega el mensaje', async () => {
  const received = [];
  await withServer(async (m) => received.push(m), async (base) => {
    const body = payload('hola');
    const res = await fetch(`${base}/webhook`, {
      method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(body) },
    });
    assert.equal(res.status, 200);
  });
  assert.deepEqual(received, [{ id: 'wamid.1', from: '34600000000', text: 'hola', timestamp: 1700000000 }]);
});

test('POST /webhook con firma inválida responde 401 y no procesa nada', async () => {
  const received = [];
  await withServer(async (m) => received.push(m), async (base) => {
    const res = await fetch(`${base}/webhook`, {
      method: 'POST', body: payload('hola'), headers: { 'X-Hub-Signature-256': 'sha256=00' },
    });
    assert.equal(res.status, 401);
  });
  assert.equal(received.length, 0);
});
