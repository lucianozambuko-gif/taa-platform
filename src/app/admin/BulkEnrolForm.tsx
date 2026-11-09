"use client";

import { useActionState, useRef } from "react";
import { bulkEnrol, type BulkState } from "./actions";

/** Paste a list or choose a CSV saved from Excel (name, email, phone). */
export default function BulkEnrolForm({ courses, preset }: { courses: { id: string; title: string }[]; preset?: { courseId?: string; company?: string; learners?: string; leadId?: string } }) {
  const [state, action, pending] = useActionState<BulkState, FormData>(bulkEnrol, {});
  const area = useRef<HTMLTextAreaElement>(null);
  const compact = !!preset?.leadId;
  return (
    <form action={action} className={compact ? "stack" : "panel stack"} style={{ gap: 10 }}>
      {!compact && (
        <>
          <h3>Bulk enrol staff from a spreadsheet</h3>
          <p className="small muted">One learner per line as name, email, phone (phone optional), or a CSV saved from Excel. New learners get an account and a link to set their password.</p>
        </>
      )}
      {preset?.leadId && <input type="hidden" name="lead_id" value={preset.leadId} />}
      <div className="grid g2" style={{ gap: 10 }}>
        <div className="field">
          <label>Course</label>
          <select name="course_id" defaultValue={preset?.courseId ?? ""} required>
            <option value="" disabled>Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="field"><label>Employer (for reports)</label><input name="company" defaultValue={preset?.company ?? ""} placeholder="Company name" /></div>
      </div>
      <div className="field">
        <label>Learners</label>
        <textarea ref={area} name="learners" rows={compact ? 4 : 6} defaultValue={preset?.learners ?? ""} placeholder={"Sipho Dlamini, sipho@company.co.za, 082 123 4567\nAyesha Patel, ayesha@company.co.za"} required />
        {!compact && (
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-label="Choose a CSV file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f && area.current) area.current.value = await f.text();
            }}
          />
        )}
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      {!!state.details?.length && <ul className="small muted">{state.details.slice(0, 8).map((d) => <li key={d}>{d}</li>)}</ul>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Enrolling…" : compact ? "Enrol all these learners" : "Enrol learners"}</button></div>
    </form>
  );
}
