import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/advisorStore";

export const dynamic = "force-dynamic";

/** Website chat: one message in, the advisor's replies out. */
export async function POST(req: Request) {
  let body: { text?: unknown; chatId?: unknown; state?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
  const chatId = typeof body.chatId === "string" && /^[0-9a-f-]{36}$/.test(body.chatId) ? body.chatId : null;
  const raw = body.state && typeof body.state === "object" ? (body.state as Record<string, unknown>) : {};
  const state = {
    step: ["search", "ask_name", "ask_phone"].includes(String(raw.step)) ? (raw.step as "search") : undefined,
    topic: ["price", "dates", "eligible", "enrol", "company", "person"].includes(String(raw.topic)) ? (raw.topic as "price") : undefined,
    course: typeof raw.course === "string" ? raw.course.slice(0, 120) : undefined,
    name: typeof raw.name === "string" ? raw.name.slice(0, 80) : undefined,
    unanswered: typeof raw.unanswered === "number" ? Math.min(raw.unanswered, 10) : 0,
    handedOver: raw.handedOver === true,
  };
  try {
    const { chatId: id, turn } = await chatTurn({ channel: "web", chatId, text, state });
    return NextResponse.json({ chatId: id, state: turn.state, replies: turn.replies });
  } catch {
    return NextResponse.json({ chatId, replies: [{ text: "Sorry, I'm having trouble right now. Please WhatsApp us instead.", link: { label: "WhatsApp us", href: "/api/wa?team=advisor" } }] });
  }
}
