// Lee toda la configuración desde variables de entorno. Sin secretos en el código.
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? '',
    appSecret: env.WHATSAPP_APP_SECRET ?? '',
    accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '',
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    graphApiVersion: env.GRAPH_API_VERSION ?? 'v21.0',
    remindersFile: env.REMINDERS_FILE ?? 'data/reminders.json',
    schedulerIntervalMs: Number(env.SCHEDULER_INTERVAL_MS ?? 15000),
  };
}
