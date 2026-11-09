"use client";

import Link from "next/link";
import { useState } from "react";
import { whatsappLink } from "@/lib/format";

type Q = { q: string; ok: "yes" | "no"; fail: string };

/** "Am I eligible?" — a few yes/no questions from the entry requirements before someone applies or pays. */
export default function Eligibility({ questions, title, next }: { questions: Q[]; title: string; next: { href: string; label: string } }) {
  const [answers, setAnswers] = useState<Record<number, "yes" | "no">>({});
  const [open, setOpen] = useState(false);
  if (!questions.length) return null;
  const done = Object.keys(answers).length === questions.length;
  const misses = questions.map((q, i) => (answers[i] && answers[i] !== q.ok ? q : null)).filter(Boolean) as Q[];
  return (
    <div className="panel stack elig" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1.1rem" }}>Am I eligible?</h3>
        {!open && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Check in 30 seconds</button>}
      </div>
      {open && (
        <>
          {questions.map((q, i) => (
            <fieldset key={i} className="elig-q">
              <legend>{q.q}</legend>
              <div className="seg" role="group">
                {(["yes", "no"] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={answers[i] === v} onClick={() => setAnswers({ ...answers, [i]: v })}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          {done && !misses.length && (
            <div className="notice ok" role="status">
              <b>Good news</b>
              <span>You meet the entry requirements for {title}. <Link href={next.href}>{next.label} →</Link></span>
            </div>
          )}
          {done && misses.length > 0 && (
            <div className="notice" role="status">
              <b>Check with us first</b>
              <span>
                {misses.map((m) => m.fail).join(" ")}{" "}
                <a href={whatsappLink(`Hi, I checked my eligibility for ${title} and need advice.`)} target="_blank" rel="noopener">Ask an advisor on WhatsApp</a>.
              </span>
            </div>
          )}
          <p className="small muted">This is a quick guide. The Academy confirms eligibility when you apply.</p>
        </>
      )}
    </div>
  );
}
