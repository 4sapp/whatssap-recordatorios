# whatsapp-recordatorios

Servicio pequeño en Node (sin dependencias) que recibe mensajes de WhatsApp Cloud API por webhook y envía recordatorios cuando vencen.

Escríbele al número: `recuérdame llamar a mamá en 10 minutos`.

## Uso

```
cp .env.example .env   # rellena con tus valores
npm start
npm test
```

- `GET /webhook`: verificación de Meta (`hub.verify_token` / `hub.challenge`)
- `POST /webhook`: mensajes entrantes, valida `X-Hub-Signature-256` (HMAC-SHA256 con el App Secret)
- `GET /health`: estado

Los recordatorios se guardan en `data/reminders.json` y un scheduler los envía vía Graph API.
