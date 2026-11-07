"use client";

import { useActionState } from "react";
import { adminEnrol, type EnrolState } from "./actions";

export default function EnrolForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<EnrolState, FormData>(adminEnrol, {});
  return (
    <form action={action} className="panel stack" style={{ gap: 12 }}>
      <h3>Enrol a learner</h3>
      <p className="small muted">For payments by EFT or employer purchase order. The learner must have an account.</p>
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="en-email">Learner email</label><input id="en-email" name="email" type="email" required /></div>
        <div className="field">
          <label htmlFor="en-course">Course</label>
          <select id="en-course" name="course_id" required defaultValue="">
            <option value="" disabled>Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Enrolling…" : "Enrol learner"}</button></div>
    </form>
  );
}
