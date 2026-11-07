"use client";

import { useActionState } from "react";
import { recordAssessment, type AssessState } from "./actions";

export default function AssessForm({ enrolment, result, note }: { enrolment: string; result: string | null; note: string | null }) {
  const [state, action, pending] = useActionState<AssessState, FormData>(recordAssessment, {});
  return (
    <form action={action} className="assess">
      <input type="hidden" name="enrolment" value={enrolment} />
      <select name="result" defaultValue={result ?? ""} aria-label="Assessment result">
        <option value="">Not assessed yet</option>
        <option value="competent">Competent</option>
        <option value="not_yet_competent">Not yet competent</option>
      </select>
      <input name="note" defaultValue={note ?? ""} placeholder="Note for the learner (optional)" aria-label="Note for the learner" />
      <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {state.error && <span className="form-error small">{state.error}</span>}
      {state.message && <span className="form-ok small">{state.message}</span>}
    </form>
  );
}
