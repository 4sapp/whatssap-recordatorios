import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseReminder } from '../src/parser.js';
import { ReminderStore } from '../src/store.js';

test('parseReminder entiende minutos, horas y sin tilde', () => {
  assert.deepEqual(parseReminder('recuérdame llamar a mamá en 10 minutos'), { text: 'llamar a mamá', delayMs: 600_000 });
  assert.deepEqual(parseReminder('Recuerdame sacar la basura en 1 hora'), { text: 'sacar la basura', delayMs: 3_600_000 });
  assert.deepEqual(parseReminder('recuérdame regar en 5 min.'), { text: 'regar', delayMs: 300_000 });
});

test('parseReminder devuelve null para mensajes que no encajan', () => {
  assert.equal(parseReminder('hola'), null);
  assert.equal(parseReminder('recuérdame algo en 0 minutos'), null);
  assert.equal(parseReminder('recuérdame algo mañana'), null);
});

test('ReminderStore guarda, filtra vencidos y marca enviados', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recordatorios-'));
  const store = new ReminderStore(path.join(dir, 'r.json'));
  const a = await store.add({ to: '1', text: 'ya', dueAt: 1000 });
  await store.add({ to: '1', text: 'luego', dueAt: 5000 });

  assert.deepEqual((await store.due(2000)).map((r) => r.text), ['ya']);
  await store.markSent(a.id);
  assert.equal((await store.due(2000)).length, 0);
  assert.equal((await store.all()).length, 2);
  await fs.rm(dir, { recursive: true, force: true });
});
