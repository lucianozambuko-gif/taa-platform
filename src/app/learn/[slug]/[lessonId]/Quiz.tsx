"use client";

import { useActionState } from "react";
import { submitQuiz, type QuizState } from "../../actions";

type Props = { lessonId: string; slug: string; title: string; questions: { q: string; o: string[] }[]; alreadyPassed: boolean };

export default function Quiz({ lessonId, slug, title, questions, alreadyPassed }: Props) {
  const [state, action, pending] = useActionState<QuizState, FormData>(submitQuiz, {});
  return (
    <form action={action} className="panel quiz">
      <input type="hidden" name="lesson" value={lessonId} />
      <input type="hidden" name="slug" value={slug} />
      <h2 style={{ fontSize: "1.35rem" }}>{title}</h2>
      <p className="muted small">Pass mark 70%. You can retake the quiz.{alreadyPassed && " You've already passed this quiz."}</p>
      {questions.map((q, qi) => (
        <div className="q" key={qi}>
          <b>{qi + 1}. {q.q}</b>
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
      </div>
    </form>
  );
}
