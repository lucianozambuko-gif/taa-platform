// Course advisor: answers the questions people ask before enrolling, on the website chat and on WhatsApp.
// Rule-based so it only ever states the Academy's real prices, dates and pages; it hands over to a person
// on duty when it can't help. If ANTHROPIC_API_KEY is set, unmatched questions get a short answer written
// only from the course list and FAQs.
import { createAdminClient } from "@/lib/supabase/server";
import { KIND_LABEL, rand } from "@/lib/format";
import { TEAM_LABEL, type Duty, type DutyTeam } from "@/lib/dutyTeams";
import { keywords, looseScore, norm } from "@/lib/searchScore";
import type { Course } from "@/lib/types";

export type Reply = { text: string; options?: string[]; link?: { label: string; href: string } };
export type AdvisorState = {
  step?: "search" | "ask_name" | "ask_phone";
  topic?: "price" | "dates" | "eligible" | "enrol" | "company" | "person";
  course?: string; // slug of the course being discussed
  name?: string;
  unanswered?: number;
  handedOver?: boolean;
};
export type Turn = { replies: Reply[]; state: AdvisorState; handover?: { team: DutyTeam; summary: string; name: string; phone: string }; matched: boolean };

const MENU = ["Find a course", "Prices and dates", "Learnerships", "Training for my company", "Talk to a person"];
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "https://taa-platform-six.vercel.app";
const has = (t: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(t));

async function catalogue() {
  const admin = createAdminClient();
  const [{ data: courses }, { data: faq }, { data: duty }] = await Promise.all([
    admin.from("courses").select("*").eq("published", true).order("title"),
    admin.from("site_content").select("value").eq("key", "faqs").maybeSingle(),
    admin.from("site_content").select("value").eq("key", "whatsapp_duty").maybeSingle(),
  ]);
  return {
    courses: (courses ?? []) as Course[],
    faqs: (Array.isArray(faq?.value) ? faq.value : []) as { q: string; a: string }[],
    duty: (duty?.value ?? {}) as Partial<Duty>,
  };
}

function priceLine(c: Course) {
  if (c.price_basis === "learnership") return "funded learnership (apply for a place)";
  if (c.price_basis === "quote" || c.price_cents == null) return "priced on request";
  return `${rand(c.price_cents)} per learner incl. VAT${c.instalments && c.instalments > 1 ? `, or ${c.instalments} monthly instalments` : ""}`;
}

function courseCard(c: Course): Reply {
  const bits = [
    `*${c.title}* (${KIND_LABEL[c.kind] ?? c.kind})`,
    `Price: ${priceLine(c)}`,
    `${c.duration ? `${c.duration} · ` : ""}${c.format}${c.location ? ` · ${c.location}` : ""}`,
    c.intakes.length ? `Next start: ${c.intakes[0]}` : c.format === "Online" ? "Start any time" : "",
    c.saqa_id ? `SAQA ID ${c.saqa_id}${c.nqf_level ? `, NQF ${c.nqf_level}` : ""}${c.credits ? `, ${c.credits} credits` : ""}` : "",
  ].filter(Boolean);
  return { text: bits.join("\n"), link: { label: "View course", href: `/courses/${c.slug}` } };
}

function findCourses(courses: Course[], text: string) {
  const words = keywords(text);
  if (!words.length) return [];
  return courses
    .map((c) => ({ c, s: looseScore(words, c.title, [c.subject, c.summary, c.code, c.audience, ...(c.outcomes ?? [])].filter(Boolean).join(" ")) }))
    .filter((r) => r.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((r) => r.c);
}

function findFaq(faqs: { q: string; a: string }[], text: string) {
  const words = keywords(text);
  if (words.length === 0) return null;
  const best = faqs.map((f) => ({ f, s: looseScore(words, f.q, f.a) })).sort((a, b) => b.s - a.s)[0];
  return best && best.s >= Math.max(4, words.length * 2) ? best.f : null;
}

function menuReply(text = "How can I help? Choose an option or type your question."): Reply {
  return { text, options: MENU };
}

/** Optional: a short answer written only from the Academy's own facts, when ANTHROPIC_API_KEY is configured. */
async function aiAnswer(question: string, courses: Course[], faqs: { q: string; a: string }[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const facts = [
    ...courses.map((c) => `${c.title} | ${KIND_LABEL[c.kind]} | ${priceLine(c)} | ${c.duration ?? ""} | ${c.format} | starts ${c.intakes[0] ?? "any time"} | ${c.summary ?? ""} | entry: ${c.entry_requirements ?? "none"}`),
    ...faqs.map((f) => `Q: ${f.q} A: ${f.a}`),
  ].join("\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ADVISOR_MODEL || "claude-haiku-5-5",
        max_tokens: 220,
        system: "You are the course advisor for Training Africa Academy in Johannesburg. Answer in 2-3 short sentences, in plain English, using ONLY the facts below. If the facts don't answer the question, reply exactly: UNKNOWN. Never invent prices, dates, accreditation or promises.\n\nFACTS:\n" + facts,
        messages: [{ role: "user", content: question.slice(0, 500) }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { content?: { text?: string }[] };
    const text = out.content?.[0]?.text?.trim();
    return text && !text.startsWith("UNKNOWN") ? text : null;
  } catch {
    return null;
  }
}

/** One turn of the conversation. `contact` is the WhatsApp number when the chat comes from WhatsApp. */
export async function advise(input: string, prev: AdvisorState, channel: "web" | "whatsapp", contact?: string): Promise<Turn> {
  const state: AdvisorState = { ...prev };
  const raw = input.trim().slice(0, 500);
  let t = norm(raw).trim();
  const { courses, faqs, duty } = await catalogue();
  const current = courses.find((c) => c.slug === state.course);
  const out = (replies: Reply[], matched = true, extra: Partial<Turn> = {}): Turn => {
    state.unanswered = matched ? 0 : (state.unanswered ?? 0) + 1;
    return { replies, state, matched, ...extra };
  };

  // WhatsApp users answer menus with numbers.
  if (/^[1-5]$/.test(t) && !state.step) t = norm(MENU[Number(t) - 1]);

  // ----- Collecting details for a handover -----
  if (state.step === "ask_name") {
    if (raw.length < 2) return out([{ text: "Please type your name so the advisor knows who they're helping." }]);
    state.name = raw.slice(0, 80);
    if (channel === "whatsapp" && contact) return handover(state, contact, duty, current);
    state.step = "ask_phone";
    return out([{ text: `Thanks, ${state.name.split(" ")[0]}. What's your WhatsApp or cell number? An advisor will message you there.` }]);
  }
  if (state.step === "ask_phone") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) return out([{ text: "That doesn't look like a phone number. Please type it like 082 123 4567." }]);
    return handover(state, raw, duty, current);
  }

  // ----- Greetings and the menu -----
  if (!t || /^(hi|hey|hello|hallo|helo|morning|good (morning|afternoon|evening)|sawubona|sanibonani|dumela|dumelang|howzit|menu|start|0)\b/.test(t)) {
    state.step = undefined;
    return out([menuReply("Hi! I'm the Training Africa Academy course advisor. I can help you find a course, check prices and start dates, and see if you qualify.")]);
  }

  // ----- A person -----
  if (has(t, "person", "human", "agent", "consultant", "advisor", "someone", "call me", "phone me", "speak", "talk")) {
    state.step = "ask_name";
    state.topic = "person";
    return out([{ text: "Sure, I'll pass you to an advisor on duty. What's your name? (We only use your details to reply to your enquiry.)" }]);
  }

  // ----- Topics -----
  if (has(t, "learnership", "funded", "stipend", "unemployed")) {
    const ls = courses.filter((c) => c.price_basis === "learnership" || c.kind === "qualification");
    return out([
      { text: "Learnerships combine classroom training with a workplace placement and lead to a full qualification. Places are funded and given by application." },
      ...ls.slice(0, 2).map(courseCard),
      { text: "You can check whether you qualify in a minute, then apply online.", link: { label: "Learnerships and how to apply", href: "/learnerships" }, options: ["Am I eligible?", "Talk to a person"] },
    ]);
  }
  if (has(t, "company", "employer", "staff", "team", "employees", "workers", "group", "corporate", "bulk", "quote", "bbbee", "b bbee", "skills levy")) {
    state.topic = "company";
    return out([
      { text: "We train teams at our Johannesburg centre or at your workplace, with group discounts from 10 staff, live progress reports for HR, and a B-BBEE skills development summary." },
      { text: "Get an instant estimate for your team, then request a formal quote.", link: { label: "Estimate for my team", href: "/employers#estimate" }, options: ["Talk to a person", "Find a course"] },
    ]);
  }
  if (has(t, "venue", "hire", "room", "boardroom", "book a room")) {
    return out([{ text: "Our centre hires out training rooms, a practical cleaning lab, a computer room and a boardroom. You can see free dates and request a booking online.", link: { label: "Venue hire and availability", href: "/venue" }, options: ["Talk to a person"] }]);
  }
  if (has(t, "where", "location", "address", "directions", "based")) {
    return out([{ text: "Our training centre is in Johannesburg, Gauteng. Online courses can be done from anywhere on your phone.", link: { label: "Contact and directions", href: "/contact" }, options: MENU.slice(0, 2) }]);
  }
  if (has(t, "instalment", "installment", "pay", "payment", "eft", "card", "payfast", "afford", "deposit")) {
    return out([{ text: "You can pay online by card or Instant EFT through PayFast. Longer programmes can be paid in monthly instalments, chosen at checkout. Employers can request an invoice." + (current ? `\n\n${current.title}: ${priceLine(current)}.` : ""), options: current ? ["Enrol", "Talk to a person"] : ["Find a course", "Talk to a person"] }]);
  }
  if (has(t, "certificate", "accredit", "saqa", "nqf", "seta", "qcto", "recognised", "recognized")) {
    if (current)
      return out([{ text: current.accreditation_approved && current.accreditation_body
        ? `${current.title} is accredited by ${current.accreditation_body}${current.saqa_id ? ` (SAQA ID ${current.saqa_id}, NQF ${current.nqf_level ?? ""})` : ""}. After assessment and moderation you get a statement of results, and the official certificate comes from the accrediting body.`
        : `${current.title} is ${KIND_LABEL[current.kind]?.toLowerCase() ?? "a skills course"}. ${current.certificate ?? "You get an Academy certificate of completion."}`, link: { label: "Course details", href: `/courses/${current.slug}` } }]);
    return out([{ text: "Accredited programmes show the accrediting body, SAQA ID and NQF level on the course page. Skills courses give an Academy certificate you can verify online and add to LinkedIn. Which course are you asking about?" }], true);
  }
  if (has(t, "eligib", "qualify", "requirement", "matric", "grade")) {
    if (current) return out([{ text: `Entry requirements for ${current.title}: ${current.entry_requirements ?? "none, it's open to everyone"}.`, link: current.eligibility?.length ? { label: "Check if I qualify", href: `/courses/${current.slug}#eligibility` } : undefined, options: ["Enrol", "Talk to a person"] }]);
    state.step = "search";
    state.topic = "eligible";
    return out([{ text: "Which course are you interested in? Type a word like cleaning, first aid or supervisor." }]);
  }
  if (has(t, "enrol", "enroll", "register", "sign up", "apply", "book")) {
    if (current) return out([{ text: current.price_basis === "fixed" ? `You can enrol in ${current.title} online and pay by card or Instant EFT. You get access straight away.` : `${current.title} is by application or quote. Send your details and an advisor will help you.`, link: { label: current.price_basis === "fixed" ? "Enrol now" : "Apply", href: `/courses/${current.slug}` } }]);
    state.step = "search";
    state.topic = "enrol";
    return out([{ text: "Great! Which course would you like to enrol in?" }]);
  }
  if (has(t, "find a course", "courses", "what do you offer", "offer", "options")) {
    state.step = "search";
    const subjects = [...new Set(courses.map((c) => c.subject))].slice(0, 6);
    return out([{ text: `What would you like to learn? We offer courses in ${subjects.join(", ").toLowerCase()}. Type a topic.` , options: subjects.slice(0, 4) }]);
  }
  const wantsPrice = has(t, "price", "cost", "how much", "fee", "rand", "prices");
  const wantsDates = has(t, "date", "when", "start", "intake", "next class", "schedule", "dates");
  if ((wantsPrice || wantsDates) && current && keywords(raw).length <= 3) {
    return out([courseCard(current), { text: "What next?", options: ["Enrol", "Am I eligible?", "Talk to a person"] }]);
  }

  // ----- Course search -----
  const found = findCourses(courses, raw);
  if (found.length) {
    state.course = found[0].slug;
    state.step = undefined;
    const intro = found.length === 1 ? "Here's the course that matches:" : `I found ${found.length} courses:`;
    return out([{ text: intro }, ...found.map(courseCard), { text: "Want to know more?", options: ["Am I eligible?", "Enrol", "Payment options", "Talk to a person"] }]);
  }
  if (wantsPrice || wantsDates) {
    state.step = "search";
    return out([{ text: "Which course? Type a topic like cleaning, first aid, safety or supervisor." }]);
  }

  // ----- FAQs, then the optional AI answer, then a person -----
  const faq = findFaq(faqs, raw);
  if (faq) return out([{ text: faq.a, options: ["Find a course", "Talk to a person"] }]);
  const ai = await aiAnswer(raw, courses, faqs);
  if (ai) return out([{ text: ai, options: ["Find a course", "Talk to a person"] }]);
  const misses = (state.unanswered ?? 0) + 1;
  return out([
    misses >= 2
      ? { text: "Sorry, I can't answer that one. An advisor can help: shall I pass you on?", options: ["Talk to a person", "Find a course"] }
      : { text: state.step === "search" ? "I couldn't find a course for that. Try another word, like cleaning, first aid, safety or supervisor." : "I'm not sure I understood. You can ask about a course, prices, start dates, learnerships or training for a company.", options: MENU },
  ], false);
}

async function handover(state: AdvisorState, phone: string, duty: Partial<Duty>, current?: Course): Promise<Turn> {
  const team: DutyTeam = state.topic === "company" ? "sales" : current?.price_basis === "learnership" ? "admissions" : "advisor";
  const onDuty = duty[team]?.on && duty[team]?.phone ? duty[team] : null;
  const name = state.name ?? "there";
  state.step = undefined;
  state.handedOver = true;
  const summary = `${current ? `Interested in ${current.title}. ` : ""}${state.topic === "company" ? "Training for a company. " : ""}Asked for a person on the website/WhatsApp advisor.`;
  return {
    replies: [
      { text: `Thanks, ${name.split(" ")[0]}. ${onDuty?.name ? `${onDuty.name} from our ${TEAM_LABEL[team].toLowerCase()} team` : `Our ${TEAM_LABEL[team].toLowerCase()} team`} will WhatsApp you during office hours (Mon to Fri, 8:00 to 16:30).` },
      { text: "You can also message them now:", link: { label: "Chat on WhatsApp", href: `/api/wa?team=${team}&m=${encodeURIComponent(`Hi, I'm ${name}. ${summary}`)}` }, options: ["Find a course"] },
    ],
    state,
    matched: true,
    handover: { team, summary, name, phone },
  };
}

export const advisorSite = site;
