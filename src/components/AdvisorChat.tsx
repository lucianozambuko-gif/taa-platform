"use client";

import { useEffect, useRef, useState } from "react";
import { whatsappLink } from "@/lib/format";

type Reply = { text: string; options?: string[]; link?: { label: string; href: string } };
type Msg = { from: "user" | "bot"; reply: Reply };
const KEY = "taa-advisor";

/** Floating "Ask an advisor" chat. Answers from the Academy's real course list, and hands over to WhatsApp or a person. */
export default function AdvisorChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, unknown>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (saved) { setMsgs(saved.msgs ?? []); setChatId(saved.chatId ?? null); setState(saved.state ?? {}); }
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ msgs: msgs.slice(-40), chatId, state })); } catch {}
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [msgs, chatId, state]);
  useEffect(() => {
    if (!open) return;
    if (!msgs.length) send("hi", true);
    setTimeout(() => input.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(t: string, silent = false) {
    const q = t.trim();
    if (!q || busy) return;
    setBusy(true);
    if (!silent) setMsgs((m) => [...m, { from: "user", reply: { text: q } }]);
    setText("");
    try {
      const res = await fetch("/api/advisor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, chatId, state }) });
      const data = (await res.json()) as { chatId: string | null; state?: Record<string, unknown>; replies: Reply[] };
      if (data.chatId) setChatId(data.chatId);
      if (data.state) setState(data.state);
      setMsgs((m) => [...m, ...data.replies.map((r) => ({ from: "bot" as const, reply: r }))]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", reply: { text: "You seem to be offline. Please try again, or WhatsApp us." } }]);
    }
    setBusy(false);
  }
  const lastOptions = [...msgs].reverse().find((m) => m.from === "bot")?.reply.options ?? [];

  return (
    <aside aria-label="Course advisor">
      {!open && (
        <button type="button" className="wa-float advisor-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 19z" /></svg>
          Ask an advisor
        </button>
      )}
      {open && (
        <div className="advisor" role="dialog" aria-label="Course advisor chat">
          <div className="advisor-head">
            <span><b>Course advisor</b><br /><span className="small">Answers right away · a person on WhatsApp in office hours</span></span>
            <button type="button" className="advisor-x" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="advisor-msgs" ref={list} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.reply.text.split("\n").map((line, j) => <span key={j}>{line.replace(/\*/g, "")}<br /></span>)}
                {m.reply.link && (
                  <a className="bubble-link" href={m.reply.link.href} target={m.reply.link.href.startsWith("/api/wa") ? "_blank" : undefined} rel="noopener">{m.reply.link.label} →</a>
                )}
              </div>
            ))}
            {busy && <div className="bubble bot typing" aria-label="Advisor is typing"><i /><i /><i /></div>}
          </div>
          {lastOptions.length > 0 && (
            <div className="advisor-opts">
              {lastOptions.map((o) => <button key={o} type="button" onClick={() => send(o)} disabled={busy}>{o}</button>)}
            </div>
          )}
          <form className="advisor-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question" aria-label="Your message" maxLength={500} />
            <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>Send</button>
          </form>
          <a className="advisor-wa" href={whatsappLink("Hi Training Africa Academy, I'd like help choosing a course.", "advisor")} target="_blank" rel="noopener">Prefer WhatsApp? Chat to us there</a>
        </div>
      )}
    </aside>
  );
}
