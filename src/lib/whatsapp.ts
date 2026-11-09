// Server-only. Sends WhatsApp messages through the Meta WhatsApp Cloud API when it is configured:
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (an approved template with one body variable {{1}}),
//   optional WHATSAPP_TEMPLATE_LANG (default "en").
// Business-initiated WhatsApp messages must use an approved template, so the message text goes into {{1}}.

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TEMPLATE);

export function toE164(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `27${d.slice(1)}` : d;
}

/** Returns true if WhatsApp accepted the message, false if it failed, null if WhatsApp isn't set up. */
export async function sendWhatsApp(phone: string, text: string): Promise<boolean | null> {
  if (!whatsappConfigured()) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toE164(phone),
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 1000) }] }],
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
