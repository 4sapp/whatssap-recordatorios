import { parseReminder } from './parser.js';

const HELP = 'Escríbeme algo como: "recuérdame llamar a mamá en 10 minutos"';

// Lógica de negocio: convierte un mensaje entrante en un recordatorio y responde.
export function createMessageHandler({ store, client, now = () => Date.now() }) {
  return async function onMessage({ from, text }) {
    const parsed = parseReminder(text);
    if (!parsed) {
      await client.sendText(from, HELP);
      return null;
    }
    const reminder = await store.add({ to: from, text: parsed.text, dueAt: now() + parsed.delayMs });
    const minutes = Math.round(parsed.delayMs / 60_000);
    await client.sendText(from, `👍 Te recordaré "${parsed.text}" en ${minutes || '<1'} min.`);
    return reminder;
  };
}
