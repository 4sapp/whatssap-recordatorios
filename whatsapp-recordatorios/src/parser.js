// Interpreta mensajes del estilo:
//   "recuérdame llamar a mamá en 10 minutos"
//   "Recuerdame sacar la basura en 1 hora"
// Devuelve { text, delayMs } o null si no encaja.
const UNITS = {
  segundo: 1000, segundos: 1000,
  minuto: 60_000, minutos: 60_000, min: 60_000,
  hora: 3_600_000, horas: 3_600_000,
};

const PATTERN = /^\s*recu[eé]rdame\s+(.+?)\s+en\s+(\d+)\s+(segundos?|minutos?|min|horas?)\s*[.!]?\s*$/i;

export function parseReminder(message) {
  const match = PATTERN.exec(message ?? '');
  if (!match) return null;
  const [, text, amount, unit] = match;
  const n = Number(amount);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return { text: text.trim(), delayMs: n * UNITS[unit.toLowerCase()] };
}
