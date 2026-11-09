import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsApp, whatsappConfigured } from "@/lib/whatsapp";

// Server-only module: never import from a client component.

type Message = {
  userId?: string | null;
  toEmail?: string | null;
  audience: "learner" | "staff" | "enquirer";
  kind: string;
  subject: string;
  body: string;
  link?: string | null;
  /** Also send by WhatsApp when the learner opted in (reminders, payments, results). */
  whatsapp?: boolean;
};

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Sends an email through Resend when RESEND_API_KEY and NOTIFY_FROM are set. Returns true if accepted. */
async function sendEmail(to: string, subject: string, body: string, link?: string | null) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from) return null;
  const text = `${body}${link ? `\n\n${link.startsWith("http") ? link : site() + link}` : ""}\n\nTraining Africa Academy`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Records a notification (learners see it in their dashboard, staff in the back office) and emails it
 * when an email provider is configured. Never throws: a failed message must not break a payment or form.
 */
export async function notify(m: Message) {
  try {
    const admin = createAdminClient();
    let to = m.toEmail ?? null;
    if (!to && m.userId) to = (await admin.auth.admin.getUserById(m.userId)).data.user?.email ?? null;
    if (!to && m.audience === "staff") to = process.env.STAFF_NOTIFY_EMAIL ?? null;
    // Demo / test mode: Resend only delivers to the account owner until a domain is verified,
    // so every email goes to NOTIFY_TEST_TO with the real recipient shown in the subject.
    const testTo = process.env.NOTIFY_TEST_TO;
    const sent = to
      ? testTo
        ? await sendEmail(testTo, `[Demo → ${to}] ${m.subject}`, m.body, m.link)
        : await sendEmail(to, m.subject, m.body, m.link)
      : null;
    const status = sent === true ? "sent" : sent === false ? "failed" : m.userId ? "in_app" : "queued";
    // WhatsApp for learners who opted in, when the WhatsApp API is configured
    if (m.whatsapp !== false && m.userId && whatsappConfigured()) {
      const { data: p } = await admin.from("profiles").select("phone, whatsapp_opt_in").eq("id", m.userId).maybeSingle();
      if (p?.whatsapp_opt_in && p.phone) {
        const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        await sendWhatsApp(process.env.NOTIFY_TEST_TO_PHONE || p.phone, `${m.subject}. ${m.body}${m.link ? ` ${m.link.startsWith("http") ? m.link : site + m.link}` : ""}`);
      }
    }
    await admin.from("notifications").insert({
      user_id: m.userId ?? null,
      audience: m.audience,
      kind: m.kind,
      to_email: to,
      subject: m.subject,
      body: m.body,
      link: m.link ?? null,
      status,
    });
  } catch (e) {
    console.warn("[notify] failed", e);
  }
}
