// Server-only: keeps advisor conversations so staff can read them, and turns handovers into leads.
import { createAdminClient } from "@/lib/supabase/server";
import { advise, type AdvisorState, type Reply, type Turn } from "@/lib/advisor";
import { notify } from "@/lib/notify";
import { ROUTING } from "@/lib/format";

type Entry = { from: "user" | "bot"; text: string; at: string };
const MAX_TURNS = 80;

export async function chatTurn(opts: { channel: "web" | "whatsapp"; chatId?: string | null; contact?: string | null; text: string; state?: AdvisorState }) {
  const admin = createAdminClient();
  type Chat = { id: string; state: AdvisorState; transcript: Entry[]; unanswered: number; lead_id: string | null };
  let chat = null as Chat | null;
  if (opts.chatId) {
    const { data } = await admin.from("advisor_chats").select("id, state, transcript, unanswered, lead_id").eq("id", opts.chatId).eq("channel", opts.channel).maybeSingle();
    chat = data as Chat | null;
  } else if (opts.contact) {
    // WhatsApp: continue the contact's conversation from the last 24 hours.
    const { data } = await admin.from("advisor_chats").select("id, state, transcript, unanswered, lead_id")
      .eq("channel", opts.channel).eq("contact", opts.contact).gte("updated_at", new Date(Date.now() - 864e5).toISOString())
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    chat = data as Chat | null;
  }
  if (chat && chat.transcript.length >= MAX_TURNS * 2)
    return { chatId: chat.id, turn: { replies: [{ text: "This chat has got long. Please WhatsApp us and an advisor will help you directly.", link: { label: "WhatsApp us", href: "/api/wa?team=advisor" } }], state: chat.state, matched: true } as Turn };

  // The website also sends the conversation state back, so the chat keeps working even if saving it fails.
  const turn = await advise(opts.text, chat?.state ?? opts.state ?? {}, opts.channel, opts.contact ?? undefined);
  const now = new Date().toISOString();
  const transcript: Entry[] = [
    ...(chat?.transcript ?? []),
    { from: "user", text: opts.text.slice(0, 500), at: now },
    ...turn.replies.map((r: Reply) => ({ from: "bot" as const, text: r.text + (r.link ? ` [${r.link.label}]` : ""), at: now })),
  ];
  let leadId = chat?.lead_id ?? null;
  if (turn.handover && !leadId) leadId = await createLead(turn, opts.channel, transcript);
  const row = { state: turn.state, transcript, unanswered: (chat?.unanswered ?? 0) + (turn.matched ? 0 : 1), handed_over: !!turn.state.handedOver, lead_id: leadId, updated_at: now };
  let id = chat?.id;
  if (id) await admin.from("advisor_chats").update(row).eq("id", id);
  else id = (await admin.from("advisor_chats").insert({ ...row, channel: opts.channel, contact: opts.contact ?? null }).select("id").single()).data?.id;
  return { chatId: id ?? null, turn };
}

async function createLead(turn: Turn, channel: "web" | "whatsapp", transcript: Entry[]) {
  const h = turn.handover!;
  const admin = createAdminClient();
  const type = h.team === "sales" ? "group_quote" : h.team === "admissions" ? "learnership" : "course_enquiry";
  let courseId: string | null = null;
  if (turn.state.course) courseId = (await admin.from("courses").select("id").eq("slug", turn.state.course).maybeSingle()).data?.id ?? null;
  const asked = transcript.filter((e) => e.from === "user").slice(-6).map((e) => e.text).join(" / ");
  const { data } = await admin.from("leads").insert({
    type, name: h.name.slice(0, 120), phone: h.phone.slice(0, 40), course_id: courseId,
    details: { note: `${h.summary} Chat: ${asked}`.slice(0, 4000) }, source: channel === "whatsapp" ? "advisor-whatsapp" : "advisor-web",
    routed_to: ROUTING[type], popia_consent: true,
  }).select("id, ref").single();
  if (data) {
    await admin.from("audit_log").insert({ action: "advisor_handover", entity: "lead", entity_id: data.id, detail: { title: data.ref, channel } });
    await notify({ audience: "staff", kind: "lead_new", subject: `Advisor chat handed over: ${data.ref} for ${ROUTING[type]}`, body: `${h.name} · ${h.phone} · ${h.summary}`, link: "/admin?tab=leads&view=chats" });
  }
  return data?.id ?? null;
}
