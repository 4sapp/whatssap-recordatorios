import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Almacén mínimo en un archivo JSON. Escribe a un .tmp y renombra para no
// dejar el archivo a medias si el proceso muere durante la escritura.
export class ReminderStore {
  constructor(file) {
    this.file = file;
    this.queue = Promise.resolve();
  }

  async #read() {
    try {
      return JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async #write(reminders) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(reminders, null, 2));
    await fs.rename(tmp, this.file);
  }

  // Serializa las operaciones para evitar carreras entre webhook y scheduler.
  #exclusive(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }

  add({ to, text, dueAt }) {
    return this.#exclusive(async () => {
      const reminders = await this.#read();
      const reminder = { id: crypto.randomUUID(), to, text, dueAt, sent: false };
      reminders.push(reminder);
      await this.#write(reminders);
      return reminder;
    });
  }

  async due(now = Date.now()) {
    const reminders = await this.#read();
    return reminders.filter((r) => !r.sent && r.dueAt <= now);
  }

  markSent(id) {
    return this.#exclusive(async () => {
      const reminders = await this.#read();
      const r = reminders.find((x) => x.id === id);
      if (r) r.sent = true;
      await this.#write(reminders);
    });
  }

  all() {
    return this.#read();
  }
}
