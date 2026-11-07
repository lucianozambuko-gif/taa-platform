"use client";

import { useActionState } from "react";
import { adminEnrol, type EnrolState } from "./actions";

export default function EnrolForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<EnrolState, FormData>(adminEnrol, {});
  return (
    <form action={action} className="panel stack" style={{ gap: 12 }}>
      <h3>Give a learner course access</h3>
      <p className="small muted">Only for payments received outside the website (EFT or employer purchase order). Online card payments enrol learners automatically. The learner needs an account.</p>
      <div className="grid g3" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="en-email">Learner email</label><input id="en-email" name="email" type="email" required /></div>
        <div className="field">
          <label htmlFor="en-course">Course</label>
          <select id="en-course" name="course_id" required defaultValue="">
            <option value="" disabled>Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="en-company">Employer (optional)</label><input id="en-company" name="company" placeholder="Company paying for this learner" /></div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Give access"}</button></div>
    </form>
  );
}
