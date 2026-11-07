"use client";

import { useActionState, useState } from "react";
import { saveStaff, type StaffState } from "./actions";

export default function StaffForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<StaffState, FormData>(saveStaff, {});
  const [role, setRole] = useState("facilitator");
  return (
    <form action={action} className="panel stack" style={{ gap: 12 }}>
      <h3>Add staff or change a role</h3>
      <p className="small muted">The person signs up first, then you give their account a role here. Facilitators only see learners on the courses you assign them.</p>
      <div className="grid g3" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="st-email">Email</label><input id="st-email" name="email" type="email" required /></div>
        <div className="field">
          <label htmlFor="st-role">Role</label>
          <select id="st-role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="facilitator">Facilitator (teacher)</option>
            <option value="admin">Admin</option>
            <option value="learner">Learner</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="st-course">Assign to course</label>
          <select id="st-course" name="course_id" defaultValue="" disabled={role !== "facilitator"}>
            <option value="">No course yet</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save role"}</button></div>
    </form>
  );
}
