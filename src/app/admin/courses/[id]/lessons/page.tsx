import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { quizToText } from "@/lib/quizText";
import type { QuizQuestion } from "@/lib/types";
import { addLesson, addModule, deleteLesson, deleteModule, move, renameModule } from "./actions";
import LessonEditor from "./LessonEditor";

export const metadata = { title: "Course lessons" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { video: "Video lesson", download: "Download", quiz: "Quiz" };
const small = { padding: "4px 8px" };

/** Build the online part of a course: modules, then video, download and quiz lessons. */
export default async function LessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin");
  if (!["admin", "content"].includes(profile?.role ?? "")) redirect("/");
  const { data: course } = await supabase.from("courses").select("id, title, slug, has_lms, certificate_auto").eq("id", id).maybeSingle();
  if (!course) notFound();
  const { data: mods } = await supabase.from("modules").select("id, title, position, lessons(id, title, kind, minutes, position)").eq("course_id", id).order("position");
  const modules = (mods ?? []).map((m) => ({ ...m, lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position) }));
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const { data: contents } = lessonIds.length
    ? await supabase.from("lesson_content").select("lesson_id, video_url, captions_url, download_url, body, quiz").in("lesson_id", lessonIds)
    : { data: [] };
  const contentOf = new Map((contents ?? []).map((c) => [c.lesson_id, c]));
  const total = modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.minutes, 0), 0);
  const missing = modules.flatMap((m) => m.lessons).filter((l) => {
    const c = contentOf.get(l.id);
    return l.kind === "video" ? !c?.video_url : l.kind === "download" ? !c?.download_url : !((c?.quiz as QuizQuestion[] | null)?.length);
  }).length;

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18, maxWidth: 960 }}>
        <div className="crumbs"><Link href="/admin?tab=courses">Back office · Courses</Link><span>/</span><Link href={`/admin/courses/${id}`}>{course.title}</Link><span>/</span><span>Lessons</span></div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem,3.4vw,2.2rem)" }}>Online lessons</h1>
            <p className="muted small">{modules.length} modules · {lessonIds.length} lessons · about {total} minutes{missing ? ` · ${missing} lesson${missing > 1 ? "s" : ""} still need content` : ""}</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn btn-ghost btn-sm" href={`/admin/courses/${id}`}>Course details</Link>
            <Link className="btn btn-ghost btn-sm" href={`/courses/${course.slug}`} target="_blank">View on site</Link>
          </div>
        </div>
        <div className="notice"><b>How it works</b><span>Learners see modules in this order and resume where they stopped. Quizzes are marked on the server with a 70% pass mark. {course.certificate_auto ? "This course issues a certificate automatically at 100%." : "This course does not issue automatic certificates (set in Course details)."} Recorded practical videos support, but never replace, required hands-on practicals or assessments.</span></div>

        {modules.map((m, mi) => (
          <div key={m.id} className="panel stack" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <form action={renameModule} className="row" style={{ gap: 8, flex: "1 1 320px" }}>
                <input type="hidden" name="id" value={m.id} /><input type="hidden" name="course_id" value={id} />
                <b style={{ whiteSpace: "nowrap" }}>Module {mi + 1}</b>
                <input name="title" defaultValue={m.title} aria-label="Module title" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
                <button className="btn btn-ghost btn-sm">Rename</button>
              </form>
              <div className="row" style={{ gap: 4 }}>
                {mi > 0 && <form action={move}><input type="hidden" name="table" value="modules" /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="up" /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small} aria-label="Move module up">↑</button></form>}
                {mi < modules.length - 1 && <form action={move}><input type="hidden" name="table" value="modules" /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="dir" value="down" /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small} aria-label="Move module down">↓</button></form>}
                <form action={deleteModule}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small} title="Deletes the module and its lessons">Delete</button></form>
              </div>
            </div>
            {m.lessons.map((l, li) => {
              const c = contentOf.get(l.id);
              const ready = l.kind === "video" ? !!c?.video_url : l.kind === "download" ? !!c?.download_url : !!(c?.quiz as QuizQuestion[] | null)?.length;
              return (
                <details key={l.id} className="card" style={{ padding: "10px 14px" }}>
                  <summary className="row" style={{ justifyContent: "space-between", cursor: "pointer", listStyle: "none" }}>
                    <span><span className="small muted">{mi + 1}.{li + 1}</span> <b>{l.title}</b> <span className="small muted">· {KIND[l.kind]} · {l.minutes} min</span></span>
                    <span className={`badge ${ready ? "b-good" : "b-warn"}`}>{ready ? "Ready" : "Needs content"}</span>
                  </summary>
                  <LessonEditor courseId={id} lesson={l} content={c ?? null} quizText={quizToText(c?.quiz as QuizQuestion[] | null)} />
                  <div className="row" style={{ gap: 4, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                    {li > 0 && <form action={move}><input type="hidden" name="table" value="lessons" /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="up" /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small}>Move up</button></form>}
                    {li < m.lessons.length - 1 && <form action={move}><input type="hidden" name="table" value="lessons" /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="down" /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small}>Move down</button></form>}
                    <form action={deleteLesson}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="course_id" value={id} /><button className="btn btn-ghost btn-sm" style={small}>Delete lesson</button></form>
                  </div>
                </details>
              );
            })}
            <form action={addLesson} className="row" style={{ gap: 8 }}>
              <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="course_id" value={id} />
              <input name="title" required placeholder="New lesson title" aria-label="New lesson title" style={{ flex: "1 1 220px", padding: "7px 9px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
              <select name="kind" aria-label="Lesson type" style={{ padding: "7px 9px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}><option value="video">Video</option><option value="download">Download</option><option value="quiz">Quiz</option></select>
              <input name="minutes" type="number" min={1} defaultValue={5} aria-label="Minutes" style={{ width: 80, padding: "7px 9px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
              <button className="btn btn-ghost btn-sm">Add lesson</button>
            </form>
          </div>
        ))}

        <form action={addModule} className="panel row" style={{ gap: 8 }}>
          <input type="hidden" name="course_id" value={id} />
          <input name="title" required placeholder={modules.length ? "Next module title" : "First module title, e.g. Safe chemical use"} aria-label="New module title" style={{ flex: "1 1 260px", padding: "8px 10px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
          <button className="btn btn-primary btn-sm">Add module</button>
        </form>
      </div>
    </section>
  );
}
