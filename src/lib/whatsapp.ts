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

/**
 * Replies inside a conversation the customer started (Meta's 24-hour customer service window), so plain text
 * and up to three reply buttons are allowed without a template. Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.
 */
export async function replyWhatsApp(phone: string, text: string, buttons: string[] = []): Promise<boolean | null> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return null;
  const body = buttons.length && buttons.length <= 3 && buttons.every((b) => b.length <= 20)
    ? { type: "interactive", interactive: { type: "button", body: { text: text.slice(0, 1024) }, action: { buttons: buttons.map((b, i) => ({ type: "reply", reply: { id: `opt${i}`, title: b.slice(0, 20) } })) } } }
    : { type: "text", text: { body: (buttons.length ? `${text}\n\n${buttons.map((b, i) => `${i + 1}. ${b}`).join("\n")}` : text).slice(0, 4096), preview_url: true } };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: toE164(phone), ...body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
