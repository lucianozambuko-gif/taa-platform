"use client";

import { useActionState, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { addPoeEvidence, moderate, submitPoe, type PoeState } from "./actions";

const SECTIONS = ["Knowledge", "Practical", "Workplace", "Other"];

/** Uploads a photo or PDF straight to private storage, then records it in the portfolio. */
export function PoeUpload({ courseId, enrolmentId, defaultSection = "Practical" }: { courseId: string; enrolmentId: string; defaultSection?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState(defaultSection);
  const [status, setStatus] = useState("");
  async function upload(files: FileList) {
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) { setStatus(`${file.name} is over 20 MB.`); continue; }
      setStatus(`Uploading ${file.name}…`);
      const path = `${courseId}/${enrolmentId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await createBrowserSupabase().storage.from("evidence").upload(path, file, { contentType: file.type });
      if (error) { setStatus(`Upload failed: ${error.message}`); return; }
      const r = await addPoeEvidence(enrolmentId, path, file.name, section);
      setStatus(r?.error ?? `Added ${file.name}`);
    }
  }
  return (
    <div className="row no-print" style={{ gap: 8, alignItems: "end" }}>
      <div className="field" style={{ flex: "0 1 180px" }}>
        <label htmlFor={`sec-${enrolmentId}`}>Evidence type</label>
        <select id={`sec-${enrolmentId}`} value={section} onChange={(e) => setSection(e.target.value)}>
          {SECTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => input.current?.click()}>Add photo or file</button>
      <input ref={input} type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      {status && <span className="small muted" role="status">{status}</span>}
    </div>
  );
}

export function SubmitPoe({ enrolmentId, count }: { enrolmentId: string; count: number }) {
  const [state, action, pending] = useActionState<PoeState, FormData>(submitPoe, {});
  return (
    <form action={action} className="stack no-print" style={{ gap: 10 }}>
      <input type="hidden" name="enrolment" value={enrolmentId} />
      <label className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="declare" style={{ marginTop: 4 }} />
        <span>I declare that the evidence in this portfolio is my own work, and that I did the practical tasks myself.</span>
      </label>
      {state.error && <p className="notice" role="alert">{state.error}</p>}
      {state.message && <p className="notice ok" role="status">{state.message}</p>}
      <div><button className="btn btn-primary" disabled={pending || count === 0}>{pending ? "Submitting…" : "Sign and submit my portfolio"}</button></div>
      {count === 0 && <p className="small muted">Add at least one piece of evidence first.</p>}
    </form>
  );
}

export function ModerateForm({ enrolmentId }: { enrolmentId: string }) {
  const [state, action, pending] = useActionState<PoeState, FormData>(moderate, {});
  return (
    <form action={action} className="stack no-print" style={{ gap: 10 }}>
      <input type="hidden" name="enrolment" value={enrolmentId} />
      <div className="field">
        <label htmlFor="mod-note">Moderator’s report</label>
        <textarea id="mod-note" name="note" rows={3} placeholder="Is the evidence valid, authentic, current and sufficient? Is the assessor's decision fair and consistent? Required when referring back." />
      </div>
      {state.error && <p className="notice" role="alert">{state.error}</p>}
      {state.message && <p className="notice ok" role="status">{state.message}</p>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" name="outcome" value="endorsed" disabled={pending}>Endorse the result</button>
        <button className="btn btn-ghost" name="outcome" value="referred" disabled={pending}>Refer back to the assessor</button>
      </div>
    </form>
  );
}
