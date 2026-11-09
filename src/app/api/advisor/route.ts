import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/advisorStore";

export const dynamic = "force-dynamic";

/** Website chat: one message in, the advisor's replies out. */
export async function POST(req: Request) {
  let body: { text?: unknown; chatId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
  const chatId = typeof body.chatId === "string" && /^[0-9a-f-]{36}$/.test(body.chatId) ? body.chatId : null;
  try {
    const { chatId: id, turn } = await chatTurn({ channel: "web", chatId, text });
    return NextResponse.json({ chatId: id, replies: turn.replies });
  } catch {
    return NextResponse.json({ chatId, replies: [{ text: "Sorry, I'm having trouble right now. Please WhatsApp us instead.", link: { label: "WhatsApp us", href: "/api/wa?team=advisor" } }] });
  }
}
