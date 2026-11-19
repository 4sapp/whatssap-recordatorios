import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ReminderStore } from '../src/store.js';
import { createWhatsAppClient } from '../src/whatsapp.js';
import { createMessageHandler } from '../src/app.js';
import { deliverDue } from '../src/scheduler.js';

async function tmpStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recordatorios-'));
  return { store: new ReminderStore(path.join(dir, 'r.json')), cleanup: () => fs.rm(dir, { recursive: true, force: true }) };
}

const fakeClient = () => {
  const sent = [];
  return { sent, sendText: async (to, body) => { sent.push({ to, body }); } };
};

test('createWhatsAppClient llama a Graph API con el formato correcto', async () => {
  let call;
  const fetchImpl = async (url, opts) => { call = { url, opts }; return { ok: true, json: async () => ({ messages: [{ id: 'x' }] }) }; };
  const client = createWhatsAppClient({ accessToken: 'T', phoneNumberId: '42', graphApiVersion: 'v21.0' }, fetchImpl);
  await client.sendText('34600000000', 'hola');
  assert.equal(call.url, 'https://graph.facebook.com/v21.0/42/messages');
  assert.equal(call.opts.headers.Authorization, 'Bearer T');
  assert.deepEqual(JSON.parse(call.opts.body), {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: '34600000000', type: 'text', text: { body: 'hola' },
  });
});

test('flujo completo: mensaje -> recordatorio guardado -> enviado al vencer', async () => {
  const { store, cleanup } = await tmpStore();
  const client = fakeClient();
  const onMessage = createMessageHandler({ store, client, now: () => 0 });

  await onMessage({ from: '34600000000', text: 'recuérdame tomar agua en 2 minutos' });
  assert.match(client.sent[0].body, /Te recordaré "tomar agua"/);

  assert.equal(await deliverDue({ store, client, now: 60_000 }), 0); // aún no vence
  assert.equal(await deliverDue({ store, client, now: 120_000 }), 1);
  assert.deepEqual(client.sent.at(-1), { to: '34600000000', body: '⏰ Recordatorio: tomar agua' });
  assert.equal(await deliverDue({ store, client, now: 200_000 }), 0); // no se reenvía
  await cleanup();
});

test('si el envío falla, el recordatorio queda pendiente para reintentar', async () => {
  const { store, cleanup } = await tmpStore();
  await store.add({ to: '1', text: 'x', dueAt: 0 });
  const failing = { sendText: async () => { throw new Error('500'); } };
  const silent = { error() {} };
  assert.equal(await deliverDue({ store, client: failing, now: 1, log: silent }), 0);
  assert.equal((await store.due(1)).length, 1);
  await cleanup();
});
