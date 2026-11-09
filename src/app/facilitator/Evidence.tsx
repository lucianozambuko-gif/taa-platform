"use client";

import { useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { addEvidence } from "./actions";

/** Upload a photo of a practical or a signed checklist with the assessment result (moderation and audits). */
export default function Evidence({ courseId, enrolmentId, files }: { courseId: string; enrolmentId: string; files: { name: string; url: string | null }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) return setStatus("Files must be 20 MB or smaller.");
    setStatus("Uploading…");
    const path = `${courseId}/${enrolmentId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await createBrowserSupabase().storage.from("evidence").upload(path, file, { contentType: file.type });
    if (error) return setStatus(`Upload failed: ${error.message}`);
    const r = await addEvidence(enrolmentId, path, file.name);
    setStatus(r?.error ? r.error : `Added ${file.name}`);
  }
  return (
    <div className="stack" style={{ gap: 4, marginTop: 6 }}>
      {files.map((f) => (f.url ? <a key={f.url} className="small" href={f.url} target="_blank" rel="noopener">📎 {f.name}</a> : <span key={f.name} className="small">📎 {f.name}</span>))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => input.current?.click()}>Add evidence</button>
      <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {status && <span className="small muted">{status}</span>}
    </div>
  );
}
