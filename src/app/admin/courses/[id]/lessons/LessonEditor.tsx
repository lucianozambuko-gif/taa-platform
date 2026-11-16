"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { saveLesson, type LessonState } from "./actions";

type Props = {
  courseId: string;
  lesson: { id: string; title: string; kind: string; minutes: number };
  content: { video_url: string | null; captions_url: string | null; download_url: string | null; body: string | null } | null;
  quizText: string;
};

/** Shows a Bunny video's processing status ("Converting…", "Ready") until it can be watched. */
function BunnyStatus({ guid }: { guid: string }) {
  const [st, setSt] = useState<{ text: string; ready: boolean; progress: number | null; resolutions: string | null } | null>(null);
  useEffect(() => {
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const r = await fetch(`/api/video/status?id=${guid}`).then((x) => x.json()).catch(() => null);
      if (stop) return;
      if (r && !r.error) setSt(r);
      if (!r || r.error || !r.ready) t = setTimeout(poll, 10000);
    };
    poll();
    return () => { stop = true; clearTimeout(t); };
  }, [guid]);
  if (!st) return <span className="small muted">Checking the video on Bunny Stream…</span>;
  return (
    <span className={`small ${st.ready ? "" : "muted"}`}>
      {st.ready ? "✓ Ready to watch" : st.text}
      {!st.ready && st.progress ? ` (${st.progress}%)` : ""}
      {st.ready && st.resolutions ? ` · qualities: ${st.resolutions}` : ""}
    </span>
  );
}

export function FileField({ name, label, courseId, accept, initial, help }: { name: string; label: string; courseId: string; accept: string; initial: string | null; help: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isVideo = name === "video_url";

  /** Videos go straight from this browser to Bunny Stream (resumable, any size). */
  async function uploadToBunny(file: File): Promise<boolean> {
    const start = await fetch("/api/video/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, ""), courseId }) });
    if (start.status === 503) return false; // Bunny not set up: fall back to file storage
    const auth = await start.json().catch(() => ({}));
    if (!start.ok) { setStatus(auth.error ?? "Couldn't start the upload."); return true; }
    const { Upload } = await import("tus-js-client");
    await new Promise<void>((resolve) => {
      const up = new Upload(file, {
        endpoint: auth.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        chunkSize: 25 * 1024 * 1024,
        headers: { AuthorizationSignature: auth.signature, AuthorizationExpire: String(auth.expire), VideoId: auth.videoId, LibraryId: String(auth.libraryId) },
        metadata: { filetype: file.type || "video/mp4", title: file.name },
        onProgress: (sent, total) => setStatus(`Uploading ${file.name}: ${Math.floor((sent / total) * 100)}%. Keep this page open.`),
        onError: (e) => { setStatus(`Upload failed: ${e.message}. Check the connection and try again; it resumes where it stopped.`); resolve(); },
        onSuccess: () => { setValue(`bunny:${auth.videoId}`); setStatus(`Uploaded ${file.name}. Save the lesson; Bunny is converting it for phones.`); resolve(); },
      });
      up.findPreviousUploads().then((prev) => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
    });
    return true;
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      if (isVideo && (await uploadToBunny(file))) return;
      if (file.size > 50 * 1024 * 1024) return setStatus("Files must be 50 MB or smaller here. Set up Bunny Stream for longer videos, or paste a video link.");
      setStatus("Uploading…");
      const path = `${courseId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await createBrowserSupabase().storage.from("lesson-files").upload(path, file, { contentType: file.type });
      if (error) return setStatus(`Upload failed: ${error.message}`);
      setValue(`storage:${path}`);
      setStatus(`Uploaded ${file.name}.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const bunny = /^bunny:[0-9a-f-]{36}$/i.test(value);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://… or upload a file" style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Upload"}</button>
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <span className="small muted">{status || (bunny ? null : help)}</span>
      {bunny && !busy && <BunnyStatus guid={value.slice(6)} />}
    </div>
  );
}

export default function LessonEditor({ courseId, lesson, content, quizText }: Props) {
  const [state, action, pending] = useActionState<LessonState, FormData>(saveLesson, {});
  return (
    <form action={action} className="stack" style={{ gap: 10, padding: "12px 0 4px" }}>
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="kind" value={lesson.kind} />
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid g2" style={{ gap: 10 }}>
        <div className="field"><label>Lesson title</label><input name="title" defaultValue={lesson.title} required /></div>
        <div className="field"><label>Minutes</label><input name="minutes" type="number" min={1} defaultValue={lesson.minutes} /></div>
      </div>
      {lesson.kind === "video" && (
        <>
          <FileField name="video_url" label="Video" courseId={courseId} accept="video/*" initial={content?.video_url ?? null} help="Upload the video (any length: it goes to Bunny Stream and plays at the quality each phone can handle), or paste a YouTube or Vimeo link." />
          <FileField name="captions_url" label="Captions (WebVTT)" courseId={courseId} accept=".vtt,text/vtt" initial={content?.captions_url ?? null} help="Captions are required for accessibility. Upload a .vtt file." />
        </>
      )}
      {lesson.kind === "download" && (
        <FileField name="download_url" label="Download (PDF or worksheet)" courseId={courseId} accept="application/pdf,.doc,.docx,.xlsx,.pptx" initial={content?.download_url ?? null} help="Only enrolled learners can open uploaded files." />
      )}
      {lesson.kind !== "quiz" && (
        <div className="field"><label>Text shown with the lesson (also a transcript or summary for low-data learners)</label><textarea name="body" rows={4} defaultValue={content?.body ?? ""} /></div>
      )}
      {lesson.kind === "quiz" && (
        <div className="field">
          <label>Questions</label>
          <textarea name="quiz" rows={10} defaultValue={quizText} className="mono" style={{ fontSize: ".85rem" }} placeholder={"Q: What should you do before mixing a chemical?\n- Guess the amount\n* Read the label and measure\n- Mix it with another product"} />
          <span className="small muted">Start each question with Q:, each answer with -, and mark the one correct answer with *. Leave a blank line between questions. Pass mark is 70%.</span>
        </div>
      )}
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save lesson"}</button></div>
    </form>
  );
}
