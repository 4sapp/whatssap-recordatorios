// Cliente mínimo para enviar mensajes de texto con WhatsApp Cloud API (Graph API).
export function createWhatsAppClient({ accessToken, phoneNumberId, graphApiVersion }, fetchImpl = fetch) {
  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

  return {
    async sendText(to, body) {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body },
        }),
      });
      if (!res.ok) {
        throw new Error(`Graph API ${res.status}: ${await res.text()}`);
      }
      return res.json();
    },
  };
}
