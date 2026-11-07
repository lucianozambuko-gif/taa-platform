"use client";

import { useActionState, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { saveLesson, type LessonState } from "./actions";

type Props = {
  courseId: string;
  lesson: { id: string; title: string; kind: string; minutes: number };
  content: { video_url: string | null; captions_url: string | null; download_url: string | null; body: string | null } | null;
  quizText: string;
};

function FileField({ name, label, courseId, accept, initial, help }: { name: string; label: string; courseId: string; accept: string; initial: string | null; help: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file: File) {
    if (file.size > 50 * 1024 * 1024) return setStatus("Files must be 50 MB or smaller. For longer videos, use a video host link.");
    setStatus("Uploading…");
    const path = `${courseId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await createBrowserSupabase().storage.from("lesson-files").upload(path, file, { contentType: file.type });
    if (error) return setStatus(`Upload failed: ${error.message}`);
    setValue(`storage:${path}`);
    setStatus(`Uploaded ${file.name}. Press Save lesson.`);
  }
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://… or upload a file" style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>Upload</button>
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <span className="small muted">{status || help}</span>
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
          <FileField name="video_url" label="Video" courseId={courseId} accept="video/mp4,video/webm" initial={content?.video_url ?? null} help="Upload an MP4 (up to 50 MB), or paste a YouTube, Vimeo or video-host link." />
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
