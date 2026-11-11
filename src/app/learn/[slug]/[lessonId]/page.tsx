import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLearningState } from "@/lib/learning";
import type { QuizQuestion } from "@/lib/types";
import CompleteButton from "./CompleteButton";
import SaveCourse from "@/components/SaveCourse";
import Quiz from "./Quiz";
import LessonVideo from "./LessonVideo";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const state = await getLearningState(slug);
  if (!state) notFound();
  if (!state.enrolled) redirect(`/courses/${slug}`);
  const { course, outline, lessons, done, pct, supabase } = state;
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) notFound();
  const lesson = lessons[index];
  const next = lessons[index + 1];
  const isDone = done.has(lesson.id);

  const { data: content } = await supabase
    .from("lesson_content")
    .select("video_url, captions_url, body, download_url, quiz")
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  // Uploaded files live in private storage: give the enrolled learner a short-lived link.
  const signed = async (v: string | null | undefined) => {
    if (!v?.startsWith("storage:")) return v ?? null;
    const { data } = await supabase.storage.from("lesson-files").createSignedUrl(v.slice(8), 60 * 60 * 3);
    return data?.signedUrl ?? null;
  };
  const [videoUrl, captionsUrl, downloadUrl] = await Promise.all([signed(content?.video_url), signed(content?.captions_url), signed(content?.download_url)]);
  // Strip answers before sending questions to the browser.
  const questions = ((content?.quiz ?? []) as QuizQuestion[]).map(({ q, o }) => ({ q, o }));

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <div className="crumbs"><Link href="/dashboard">My learning</Link><span>/</span><span>{course.title}</span></div>
        <div className="lesson">
          <nav className="card outline" aria-label="Course outline">
            <div style={{ padding: "10px 10px 4px" }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b>{course.title}</b><span className="tnum small muted">{pct}%</span></div>
              <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${pct}%` }} /></div>
              <SaveCourse slug={slug} urls={["/dashboard", ...lessons.map((l) => `/learn/${slug}/${l.id}`)]} />
            </div>
            {outline.map((m) => (
              <div key={m.id}>
                <h4>Module {m.position}: {m.title}</h4>
                {m.lessons.map((l) => (
                  <Link key={l.id} className="lbtn" href={`/learn/${slug}/${l.id}`} aria-current={l.id === lesson.id}>
                    <span className={`st ${done.has(l.id) ? "ok" : ""}`}>{done.has(l.id) ? "✓" : ""}</span>
                    <span>{l.title}</span>
                    <span className="mins">{l.minutes}m</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="stack" style={{ gap: 16, minWidth: 0 }}>
            {pct === 100 && (
              <div className="celebrate">
                <div className="dots" aria-hidden="true">
                  {["var(--accent)", "var(--ochre)", "var(--plum)", "var(--good)", "var(--accent)", "var(--ochre)", "var(--plum)", "var(--good)"].map((c, i) => (
                    <span key={i} style={{ left: `${8 + i * 12}%`, top: 0, background: c, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
                <div className="burst"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg></div>
                <h1 style={{ fontSize: "1.4rem" }}>You've finished {course.title}</h1>
                <p className="muted">Every lesson and quiz is complete.{course.certificate_auto ? " Your certificate is ready." : " The Academy issues your result after assessment."}</p>
                <div className="row" style={{ justifyContent: "center" }}>
                  {course.certificate_auto && <Link className="btn btn-primary" href={`/certificate/${slug}`}>Download certificate</Link>}
                  <Link className="btn btn-ghost" href="/dashboard">Back to my learning</Link>
                </div>
              </div>
            )}
            {lesson.kind === "video" && (
              <>
                {videoUrl ? (
                  <LessonVideo
                    src={videoUrl}
                    captions={captionsUrl}
                    title={lesson.title}
                    minutes={lesson.minutes}
                    poster={<><div className="art" /><div className="ttl"><small>Lesson {index + 1} of {lessons.length}</small>{lesson.title}</div></>}
                  />
                ) : (
                  <div className="player">
                    <div className="art" />
                    <div className="ttl"><small>Lesson {index + 1} of {lessons.length}</small>{lesson.title}</div>
                    <div className="cap">The Academy's recorded lesson video appears here once uploaded.</div>
                  </div>
                )}
                {content?.body && <p className="muted">{content.body}</p>}
              </>
            )}
            {lesson.kind === "download" && (
              <div className="panel stack">
                <h1 style={{ fontSize: "1.35rem" }}>{lesson.title}</h1>
                {content?.body && <p className="muted">{content.body}</p>}
                {downloadUrl ? (
                  <div><a className="btn btn-ghost" href={downloadUrl} target="_blank" rel="noopener">Download</a></div>
                ) : (
                  <p className="small muted">The PDF will be available here once the Academy uploads it.</p>
                )}
              </div>
            )}
            {lesson.kind === "quiz" && <Quiz lessonId={lesson.id} slug={slug} title={lesson.title} next={next?.id ?? ""} questions={questions} alreadyPassed={isDone} />}

            <div className="row" style={{ justifyContent: "space-between" }}>
              {lesson.kind !== "quiz" ? (
                <CompleteButton lesson={lesson.id} slug={slug} next={next?.id ?? ""} isDone={isDone} />
              ) : <span />}
              {next ? (
                <Link className="btn btn-ghost" href={`/learn/${slug}/${next.id}`}>Next: {next.title} →</Link>
              ) : pct === 100 ? (
                <span className="badge b-good">Course complete</span>
              ) : (
                <span className="badge b-short">Last lesson</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
