import Link from "next/link";
import { notFound } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { PortalHead, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";
import type { QuizQuestion } from "@/lib/types";

export const metadata = { title: "Review my quiz" };
export const dynamic = "force-dynamic";

/** A learner goes back over a quiz attempt. What they see is set by the teacher for each quiz. */
export default async function ReviewQuiz({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ a?: string }> }) {
  const { lessonId } = await params;
  const { a } = await searchParams;
  const s = await loadStudent(`/dashboard/review/${lessonId}`);
  const course = s.courses.find((c) => c.ordered.some((l) => l.id === lessonId));
  if (!course) notFound();
  const lesson = course.ordered.find((l) => l.id === lessonId)!;

  const [{ data: content }, { data: attempts }] = await Promise.all([
    s.supabase.from("lesson_content").select("quiz, quiz_review").eq("lesson_id", lessonId).maybeSingle(),
    s.supabase.from("quiz_attempts").select("id, score, passed, answers, created_at").eq("user_id", s.user.id).eq("lesson_id", lessonId).order("created_at", { ascending: false }),
  ]);
  const quiz = (content?.quiz ?? []) as QuizQuestion[];
  const review = (content?.quiz_review ?? "full") as "off" | "mine" | "full";
  const list = attempts ?? [];
  const attempt = list.find((x) => String(x.id) === a) ?? list[0];
  const answers = (Array.isArray(attempt?.answers) ? attempt.answers : []) as (number | null)[];

  return (
    <PortalShell s={s}>
      <PortalHead eyebrow={course.courses.title} title={`Review: ${lesson.title}`}>
        <Link className="btn btn-ghost btn-sm" href={`/learn/${course.courses.slug}/${lessonId}`}>Retake the quiz</Link>
      </PortalHead>

      {!attempt && <div className="panel"><p className="muted">You haven&apos;t tried this quiz yet.</p></div>}

      {attempt && (
        <div className="panel row" style={{ justifyContent: "space-between", gap: 12 }}>
          <span>
            <b className="tnum" style={{ fontSize: "1.4rem" }}>{attempt.score}%</b>{" "}
            <span className={`badge ${attempt.passed ? "b-good" : "b-warn"}`}>{attempt.passed ? "Passed" : "Below 70%"}</span>
            <br /><span className="small muted">Attempt on {day(attempt.created_at)}</span>
          </span>
          {list.length > 1 && (
            <nav className="row" style={{ gap: 6 }} aria-label="Your attempts">
              {list.map((x, i) => (
                <Link key={x.id} href={`?a=${x.id}`} className={`btn btn-sm ${x.id === attempt.id ? "btn-primary" : "btn-ghost"}`}>
                  {i === 0 ? "Latest" : `Try ${list.length - i}`} · {x.score}%
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}

      {attempt && review === "off" && (
        <div className="panel"><p className="muted">Your teacher shows only the score for this quiz, so the questions can&apos;t be reviewed. If you&apos;re unsure about a topic, go back over the lessons or ask your facilitator.</p></div>
      )}

      {attempt && review !== "off" && !answers.length && (
        <div className="panel"><p className="muted">The answers for this attempt weren&apos;t recorded, so it can&apos;t be reviewed. Your next attempt can be.</p></div>
      )}

      {attempt && review !== "off" && answers.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          {review === "mine" && <p className="small muted">Your teacher shows which answers were right or wrong, but not the correct answers.</p>}
          {quiz.map((q, i) => {
            const mine = answers[i];
            const right = mine === q.a;
            return (
              <div key={i} className={`panel review-q ${right ? "is-right" : "is-wrong"}`}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "nowrap" }}>
                  <b>{i + 1}. {q.q}</b>
                  <span className={`badge ${right ? "b-good" : "b-bad"}`}>{right ? "Right" : mine == null ? "Not answered" : "Wrong"}</span>
                </div>
                <ul className="review-opts">
                  {q.o.map((o, oi) => {
                    const isMine = mine === oi;
                    const isCorrect = review === "full" && q.a === oi;
                    return (
                      <li key={oi} className={`${isMine ? (right ? "mine right" : "mine wrong") : ""}${isCorrect && !isMine ? " correct" : ""}`}>
                        <span>{o}</span>
                        {isMine && <span className="small">Your answer</span>}
                        {isCorrect && !isMine && <span className="small">Correct answer</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <p className="small"><Link href="/dashboard/results">← Back to results</Link></p>
    </PortalShell>
  );
}
