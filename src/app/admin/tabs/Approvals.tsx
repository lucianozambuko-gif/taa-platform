import type { QuizQuestion } from "@/lib/types";
import ReviewForm from "../ReviewForm";
import { type DB, when } from "./shared";

const KIND: Record<string, string> = { video: "Video lesson", quiz: "Quiz", download: "Download" };
type P = {
  id: string; course_id: string; action: string; lesson_id: string | null; module_id: string | null; new_module_title: string | null;
  title: string; kind: string; minutes: number; content: Record<string, unknown>; message: string | null; status: string;
  review_note: string | null; proposed_by: string; reviewed_by: string | null; created_at: string; reviewed_at: string | null;
};

function Quiz({ quiz, label }: { quiz: QuizQuestion[]; label: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="flabel">{label}</span>
      {quiz.map((q, i) => (
        <div key={i} className="small">
          <b>{i + 1}. {q.q}</b>
          <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
            {q.o.map((o, j) => <li key={j} style={j === q.a ? { color: "var(--good)", fontWeight: 700 } : undefined}>{o}{j === q.a ? " (correct)" : ""}</li>)}
          </ul>
        </div>
      ))}
      {!quiz.length && <span className="small muted">No questions.</span>}
    </div>
  );
}

/** Facilitators' lesson and quiz suggestions waiting for an admin or content editor. */
export default async function ApprovalsTab({ supabase }: { supabase: DB }) {
  const { data } = await supabase.from("lesson_proposals").select("*").in("status", ["pending", "approved", "rejected"]).order("created_at", { ascending: false }).limit(80);
  const rows = (data ?? []) as P[];
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending").slice(0, 15);
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const lessonIds = [...new Set(rows.map((r) => r.lesson_id).filter(Boolean) as string[])];
  const moduleIds = [...new Set(pending.map((r) => r.module_id).filter(Boolean) as string[])];
  const [{ data: courses }, { data: staff }, { data: lessons }, { data: current }, { data: mods }] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id, title, slug").in("id", courseIds) : Promise.resolve({ data: [] }),
    supabase.rpc("staff_directory"),
    lessonIds.length ? supabase.from("lessons").select("id, title, minutes").in("id", lessonIds) : Promise.resolve({ data: [] }),
    lessonIds.length ? supabase.from("lesson_content").select("lesson_id, video_url, captions_url, download_url, body, quiz").in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
    moduleIds.length ? supabase.from("modules").select("id, title, position").in("id", moduleIds) : Promise.resolve({ data: [] }),
  ]);
  const people = (staff ?? []) as { id: string; full_name: string | null }[];
  const who = (id: string | null) => people.find((p) => p.id === id)?.full_name ?? "Staff member";
  const course = (id: string) => (courses ?? []).find((c) => c.id === id);
  const sign = async (v: unknown) => {
    const s = typeof v === "string" ? v : "";
    if (!s.startsWith("storage:")) return s || null;
    return (await supabase.storage.from("lesson-files").createSignedUrl(s.slice(8), 60 * 60)).data?.signedUrl ?? null;
  };
  const fileLink = async (label: string, v: unknown) => {
    const url = await sign(v);
    if (!url) return null;
    return <p className="small" key={label}>{label}: <a href={url} target="_blank" rel="noopener">{typeof v === "string" && v.startsWith("storage:") ? "uploaded file" : String(v)}</a></p>;
  };

  const cards = await Promise.all(pending.map(async (p) => {
    const was = (current ?? []).find((c) => c.lesson_id === p.lesson_id);
    const oldLesson = (lessons ?? []).find((l) => l.id === p.lesson_id);
    const place = p.action === "new_lesson"
      ? p.module_id ? `Added to the end of “${(mods ?? []).find((m) => m.id === p.module_id)?.title ?? "its module"}”` : `In a new module: “${p.new_module_title ?? "New module"}”`
      : `Changes to “${oldLesson?.title ?? p.title}”`;
    const files = (await Promise.all([fileLink("Video", p.content.video_url), fileLink("Captions", p.content.captions_url), fileLink("File", p.content.download_url)])).filter(Boolean);
    return (
      <div key={p.id} className="panel stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          <span>
            <span className={`badge ${p.action === "new_lesson" ? "b-acc" : "b-short"}`}>{p.action === "new_lesson" ? "New lesson" : "Changes"}</span>{" "}
            <b>{p.title}</b> <span className="small muted">· {KIND[p.kind]} · {p.minutes} min</span>
            <br /><span className="small muted">{course(p.course_id)?.title} · {place} · from {who(p.proposed_by)} · {when(p.created_at)}</span>
          </span>
          {course(p.course_id) && <a className="btn btn-ghost btn-sm" href={`/admin/courses/${p.course_id}/lessons`}>Open course lessons</a>}
        </div>
        {p.message && <p className="small"><b>Note from {who(p.proposed_by).split(" ")[0]}:</b> {p.message}</p>}
        {p.action === "edit_lesson" && oldLesson && (oldLesson.title !== p.title || oldLesson.minutes !== p.minutes) && (
          <p className="small">Title / length: <s className="muted">{oldLesson.title} · {oldLesson.minutes} min</s> → <b>{p.title} · {p.minutes} min</b></p>
        )}
        {files}
        {typeof p.content.body === "string" && <p className="small"><span className="flabel">Text for learners</span><br />{p.content.body}</p>}
        {p.kind === "quiz" && (
          <div className={p.action === "edit_lesson" ? "grid g2" : ""} style={{ gap: 16 }}>
            {p.action === "edit_lesson" && <Quiz quiz={(was?.quiz ?? []) as QuizQuestion[]} label="Questions now" />}
            <Quiz quiz={(p.content.quiz ?? []) as QuizQuestion[]} label={p.action === "edit_lesson" ? "Suggested questions" : "Questions"} />
          </div>
        )}
        <ReviewForm id={p.id} />
      </div>
    );
  }));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted">Facilitators suggest new lessons, quizzes and changes for the courses they teach. Nothing reaches learners until you approve it here. Approving adds the lesson to the end of its module (you can reorder it under Courses → Online lessons) and tells the facilitator.</p>
      <h2 className="h3">Waiting for approval ({pending.length})</h2>
      {cards}
      {!pending.length && <div className="panel"><p className="muted">Nothing waiting.</p></div>}
      {done.length > 0 && (
        <div className="panel stack" style={{ gap: 6 }}>
          <h2 className="h3">Recently reviewed</h2>
          {done.map((p) => (
            <div key={p.id} className="row" style={{ justifyContent: "space-between", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
              <span className="small"><b>{p.title}</b> · {course(p.course_id)?.title} · from {who(p.proposed_by)}{p.review_note ? ` · “${p.review_note}”` : ""}</span>
              <span className={`badge ${p.status === "approved" ? "b-good" : "b-bad"}`}>{p.status === "approved" ? "Approved" : "Not approved"} by {who(p.reviewed_by).split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
