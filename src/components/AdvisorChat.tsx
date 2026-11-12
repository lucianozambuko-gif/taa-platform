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
        <button type="button" className="wa-float advisor-btn wa-icon" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ask an advisor on WhatsApp" title="Ask an advisor">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="#FFFFFF" d="M16.04 3C9.4 3 4 8.33 4 14.9c0 2.3.67 4.45 1.83 6.27L4 29l8.06-2.05a12.2 12.2 0 0 0 3.98.67C22.68 27.62 28 22.3 28 15.72 28 9.15 22.68 3 16.04 3Zm0 22.37c-1.24 0-2.45-.22-3.59-.66l-.43-.17-4.78 1.22 1.24-4.6-.28-.45a9.86 9.86 0 0 1-1.57-5.35c0-5.46 4.48-9.9 9.41-9.9 5.42 0 9.69 4.43 9.69 9.86 0 5.43-4.27 10.05-9.69 10.05Z"/>
            <path fill="#FFFFFF" d="M21.47 18.3c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.29-.77.96-.94 1.15-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.45.13-.6.13-.13.3-.34.44-.51.15-.17.2-.3.3-.49.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.29-1.04 1-1.04 2.45 0 1.44 1.06 2.84 1.21 3.03.15.2 2.09 3.18 5.06 4.46.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.12-.27-.2-.57-.34Z"/>
          </svg>
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
