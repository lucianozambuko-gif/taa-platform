"use client";

import { useActionState } from "react";
import { setQuizReview, type QuizEditState } from "./actions";

const OPTIONS: [string, string, string][] = [
  ["full", "Answers and correct answers", "Learners see what they chose and the right answer for each question."],
  ["mine", "Right or wrong only", "Learners see which questions they got wrong, but not the correct answers. Good when they may retake it."],
  ["off", "Score only", "Learners see their score and nothing else. Use for formal tests."],
];

/** The teacher's choice of what learners may review after a quiz. */
export default function ReviewSetting({ lesson, value }: { lesson: string; value: string }) {
  const [state, action, pending] = useActionState<QuizEditState, FormData>(setQuizReview, {});
  return (
    <form action={action} className="stack review-setting" style={{ gap: 8 }}>
      <input type="hidden" name="lesson" value={lesson} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="small" style={{ fontWeight: 700, marginBottom: 6 }}>What learners can review after the quiz</legend>
        {OPTIONS.map(([v, label, help]) => (
          <label key={v} className="opt" style={{ alignItems: "flex-start" }}>
            <input type="radio" name="mode" value={v} defaultChecked={value === v} />
            <span><b>{label}</b><br /><span className="small muted">{help}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost btn-sm" disabled={pending}>{pending ? "Saving…" : "Save review setting"}</button>
        {state.message && <span className="small" style={{ color: "var(--good)" }}>{state.message}</span>}
        {state.error && <span className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
