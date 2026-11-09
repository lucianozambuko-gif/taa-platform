import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/advisorStore";
import { replyWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Meta calls this once to confirm the webhook (WHATSAPP_VERIFY_TOKEN must match what's entered in Meta). */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && u.get("hub.mode") === "subscribe" && u.get("hub.verify_token") === token) return new NextResponse(u.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

type WaMessage = { from: string; type: string; text?: { body: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } };

/** Incoming WhatsApp messages: the advisor answers; links are sent as full addresses. */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new NextResponse("Not configured", { status: 503 });
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return new NextResponse("Bad signature", { status: 401 });

  let payload: { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] };
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const messages = (payload.entry ?? []).flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://taa-platform-six.vercel.app";
  for (const m of messages) {
    const text = m.text?.body ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
    if (!text) {
      await replyWhatsApp(m.from, "Sorry, I can only read text messages. Type *menu* to see what I can help with.");
      continue;
    }
    const { turn } = await chatTurn({ channel: "whatsapp", contact: m.from, text });
    for (const [i, r] of turn.replies.entries()) {
      const link = r.link ? `\n${r.link.label}: ${r.link.href.startsWith("http") ? r.link.href : site + r.link.href}` : "";
      await replyWhatsApp(m.from, r.text + link, i === turn.replies.length - 1 ? r.options ?? [] : []);
    }
  }
  return NextResponse.json({ ok: true });
}
