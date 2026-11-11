"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { enqueue, isOffline } from "@/lib/offlineQueue";
import { submitQuiz, type QuizState } from "../../actions";

type Props = { lessonId: string; slug: string; title: string; next?: string; questions: { q: string; o: string[] }[]; alreadyPassed: boolean };

export default function Quiz({ lessonId, slug, title, next, questions, alreadyPassed }: Props) {
  const [state, action, pending] = useActionState<QuizState, FormData>(submitQuiz, {});
  const [heldOffline, setHeldOffline] = useState(false);
  return (
    <form
      action={action}
      className="panel quiz"
      onSubmit={(e) => {
        if (!isOffline()) return;
        // No signal: keep the answers on the phone. They are marked on the server once back online.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        enqueue({ kind: "quiz", lesson: lessonId, slug, title, at: new Date().toISOString(), answers: questions.map((_, i) => (fd.get(`q${i}`) == null ? null : Number(fd.get(`q${i}`)))) });
        setHeldOffline(true);
      }}
    >
      <input type="hidden" name="lesson" value={lessonId} />
      <input type="hidden" name="slug" value={slug} />
      <h1 style={{ fontSize: "1.35rem" }}>{title}</h1>
      <p className="muted small">Pass mark 70%. You can retake the quiz.{alreadyPassed && " You've already passed this quiz."}</p>
      {questions.map((q, qi) => (
        <div className={`q${state.marks ? (state.marks[qi] ? " q-right" : " q-wrong") : ""}`} key={qi}>
          <b>{qi + 1}. {q.q}{state.marks && <span className={`badge ${state.marks[qi] ? "b-good" : "b-bad"}`} style={{ marginLeft: 8 }}>{state.marks[qi] ? "Right" : "Wrong"}</span>}</b>
          {q.o.map((o, oi) => {
            const cls = state.correct ? (state.correct[qi] === oi ? "opt right" : "opt") : "opt";
            return (
              <label className={cls} key={oi}>
                <input type="radio" name={`q${qi}`} value={oi} required />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      ))}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Marking…" : "Submit answers"}</button>
        {state.score != null && (
          <span className={`badge ${state.passed ? "b-good" : "b-bad"}`}>
            {state.score}%: {state.passed ? "passed, progress saved" : "below 70%, try again"}
          </span>
        )}
        {state.error && <span className="form-error">{state.error}</span>}
        {state.score != null && state.review !== "off" && <Link className="small" href={`/dashboard/review/${lessonId}`}>Review my answers →</Link>}
        {state.score != null && state.review === "off" && <span className="small muted">Your teacher shows scores only for this quiz.</span>}
        {heldOffline && state.score == null && (
          <span className="badge b-short">Answers saved on this phone. We’ll mark them when you’re back online.{next ? " You can carry on with the next lesson." : ""}</span>
        )}
      </div>
    </form>
  );
}
