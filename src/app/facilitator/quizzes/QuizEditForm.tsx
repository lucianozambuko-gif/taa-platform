"use client";

import { useActionState } from "react";
import { saveQuizQuestions, type QuizEditState } from "./actions";

export default function QuizEditForm({ lesson, text }: { lesson: string; text: string }) {
  const [state, action, pending] = useActionState<QuizEditState, FormData>(saveQuizQuestions, {});
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="lesson" value={lesson} />
      <label className="small" htmlFor={`qz-${lesson}`}><b>Questions</b> · start each question with <code>Q:</code>, each answer with <code>-</code>, mark the one correct answer with <code>*</code>, and leave a blank line between questions. Pass mark 70%.</label>
      <textarea id={`qz-${lesson}`} name="quiz" rows={12} defaultValue={text} className="mono" style={{ fontSize: ".86rem" }} placeholder={"Q: What should you do before mixing a chemical?\n- Guess the amount\n* Read the label and measure\n- Mix it with another product"} />
      {state.error && <p className="notice" role="alert">{state.error}</p>}
      {state.message && <p className="notice ok" role="status">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save questions"}</button></div>
    </form>
  );
}
