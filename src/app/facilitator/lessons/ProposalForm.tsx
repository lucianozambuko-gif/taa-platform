"use client";

import { useActionState, useState } from "react";
import { FileField } from "@/app/admin/courses/[id]/lessons/LessonEditor";
import { proposeLesson, type ProposalState } from "./actions";

type Props = {
  courseId: string;
  modules?: { id: string; title: string }[];
  lesson?: { id: string; title: string; kind: string; minutes: number };
  content?: { video_url?: string | null; captions_url?: string | null; download_url?: string | null; body?: string | null } | null;
  quizText?: string;
  submitLabel?: string;
};

/** New lesson or changes to an existing one, sent to an admin or content editor for approval. */
export default function ProposalForm({ courseId, modules, lesson, content, quizText = "", submitLabel }: Props) {
  const [state, action, pending] = useActionState<ProposalState, FormData>(proposeLesson, {});
  const [kind, setKind] = useState(lesson?.kind ?? "video");
  const [moduleSel, setModuleSel] = useState(modules?.at(-1)?.id ?? "new");
  if (state.message) return <p className="notice ok" role="status">{state.message}</p>;
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="course_id" value={courseId} />
      {lesson && <input type="hidden" name="lesson_id" value={lesson.id} />}
      {lesson && <input type="hidden" name="kind" value={lesson.kind} />}
      {!lesson && (
        <div className="grid g2" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor={`m-${courseId}`}>Module</label>
            <select id={`m-${courseId}`} name="module_id" value={moduleSel} onChange={(e) => setModuleSel(e.target.value)}>
              {(modules ?? []).map((m, i) => <option key={m.id} value={m.id}>Module {i + 1}: {m.title}</option>)}
              <option value="new">+ A new module</option>
            </select>
          </div>
          {moduleSel === "new" ? (
            <div className="field"><label htmlFor={`nm-${courseId}`}>New module name</label><input id={`nm-${courseId}`} name="new_module_title" placeholder="e.g. Module 3: Safe chemical use" /></div>
          ) : (
            <div className="field">
              <label htmlFor={`k-${courseId}`}>Lesson type</label>
              <select id={`k-${courseId}`} name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="video">Video lesson</option><option value="quiz">Quiz</option><option value="download">Download (PDF or worksheet)</option>
              </select>
            </div>
          )}
          {moduleSel === "new" && (
            <div className="field">
              <label htmlFor={`k2-${courseId}`}>Lesson type</label>
              <select id={`k2-${courseId}`} name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="video">Video lesson</option><option value="quiz">Quiz</option><option value="download">Download (PDF or worksheet)</option>
              </select>
            </div>
          )}
        </div>
      )}
      <div className="grid g2" style={{ gap: 10 }}>
        <div className="field"><label>Lesson title</label><input name="title" defaultValue={lesson?.title ?? ""} required placeholder="e.g. Colour-coding cloths" /></div>
        <div className="field"><label>Minutes</label><input name="minutes" type="number" min={1} max={600} defaultValue={lesson?.minutes ?? 10} /></div>
      </div>
      {kind === "video" && (
        <>
          <FileField name="video_url" label="Video" courseId={courseId} accept="video/mp4,video/webm" initial={content?.video_url ?? null} help="Upload an MP4 (up to 50 MB) or paste a YouTube or Vimeo link." />
          <FileField name="captions_url" label="Captions (WebVTT file)" courseId={courseId} accept=".vtt,text/vtt" initial={content?.captions_url ?? null} help="Every lesson needs captions for learners with hearing loss. Upload a .vtt file, or use a YouTube video with captions switched on." />
        </>
      )}
      {kind === "download" && (
        <FileField name="download_url" label="File" courseId={courseId} accept="application/pdf,.doc,.docx,.xlsx,.pptx" initial={content?.download_url ?? null} help="PDF, Word, Excel or PowerPoint, up to 50 MB." />
      )}
      {kind !== "quiz" && (
        <div className="field"><label>Text under the lesson (optional)</label><textarea name="body" rows={3} defaultValue={content?.body ?? ""} placeholder="A short summary or instructions for learners" /></div>
      )}
      {kind === "quiz" && (
        <div className="field">
          <label>Questions</label>
          <textarea name="quiz" rows={10} defaultValue={quizText} className="mono" style={{ fontSize: ".86rem" }} placeholder={"Q: What colour cloth is used in washrooms?\n- Blue\n* Red\n- Green"} />
          <span className="small muted">Start each question with Q:, each answer with -, mark the one correct answer with *. Leave a blank line between questions. Pass mark 70%.</span>
        </div>
      )}
      <div className="field"><label>Note for the reviewer (optional)</label><input name="message" placeholder="Why this lesson or change is needed" /></div>
      {state.error && <p className="notice" role="alert">{state.error}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Sending…" : submitLabel ?? "Send for approval"}</button></div>
    </form>
  );
}
