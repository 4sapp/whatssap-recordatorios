// Revisa periódicamente los recordatorios vencidos y los envía.
// Si un envío falla, el recordatorio queda pendiente y se reintenta en el siguiente tick.
export async function deliverDue({ store, client, now = Date.now(), log = console }) {
  const due = await store.due(now);
  let sent = 0;
  for (const reminder of due) {
    try {
      await client.sendText(reminder.to, `⏰ Recordatorio: ${reminder.text}`);
      await store.markSent(reminder.id);
      sent++;
    } catch (err) {
      log.error(`No se pudo enviar el recordatorio ${reminder.id}:`, err.message);
    }
  }
  return sent;
}

export function startScheduler({ store, client, intervalMs }) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // evita solapar ticks si la API va lenta
    running = true;
    try {
      await deliverDue({ store, client });
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
