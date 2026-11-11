import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { quizToText } from "@/lib/quizText";
import type { QuizQuestion } from "@/lib/types";
import QuizEditForm from "./QuizEditForm";
import ReviewSetting from "./ReviewSetting";
import ProposalForm from "../lessons/ProposalForm";

export const metadata = { title: "Quizzes" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
type Attempt = { user_id: string; lesson_id: string; score: number; passed: boolean; answers: (number | null)[]; created_at: string };

/** Quiz results for the courses a facilitator teaches: who passed, who is struggling, which questions are missed. */
export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ course?: string; quiz?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator/quizzes");
  const role = profile?.role ?? "";
  if (!["facilitator", "admin", "content"].includes(role)) redirect("/");
  const sp = await searchParams;

  let courseIds: string[] | null = null;
  if (role === "facilitator") courseIds = ((await supabase.from("course_facilitators").select("course_id").eq("user_id", user.id)).data ?? []).map((r) => r.course_id);
  let q = supabase.from("courses").select("id, title, slug, modules(position, lessons(id, title, kind, minutes, position))").eq("has_lms", true).order("title");
  if (courseIds) q = q.in("id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);
  type C = { id: string; title: string; slug: string; modules: { position: number; lessons: { id: string; title: string; kind: string; minutes: number; position: number }[] }[] };
  const courses = ((await q).data ?? []) as unknown as C[];
  const active = courses.find((c) => c.slug === sp.course) ?? courses.find((c) => c.modules.some((m) => m.lessons.some((l) => l.kind === "quiz"))) ?? courses[0];
  const quizzes = active ? active.modules.sort((a, b) => a.position - b.position).flatMap((m) => m.lessons.sort((a, b) => a.position - b.position).filter((l) => l.kind === "quiz")) : [];
  const ids = quizzes.map((l) => l.id);

  const [{ data: contents }, { data: attemptRows }, { data: enrols }] = ids.length
    ? await Promise.all([
        supabase.from("lesson_content").select("lesson_id, quiz, quiz_review").in("lesson_id", ids),
        supabase.from("quiz_attempts").select("user_id, lesson_id, score, passed, answers, created_at").in("lesson_id", ids).order("created_at", { ascending: false }),
        supabase.from("enrolments").select("user_id").eq("course_id", active!.id),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const learnerIds = [...new Set((enrols ?? []).map((e) => e.user_id))];
  const [{ data: people }, { data: passes }] = learnerIds.length && ids.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", learnerIds),
        supabase.from("lesson_progress").select("user_id, lesson_id, score, completed_at").in("lesson_id", ids).in("user_id", learnerIds),
      ])
    : [{ data: [] }, { data: [] }];
  const attempts = (attemptRows ?? []) as Attempt[];
  const name = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "Learner";
  const canEdit = role === "facilitator" || role === "content" || role === "admin";
  const open = sp.quiz ?? ids[0];

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">Quizzes</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Quiz results and questions</h1>
          <p className="muted" style={{ marginTop: 6 }}>See who has passed each quiz, who keeps failing, and which questions most learners get wrong. You can suggest new questions for courses you teach; an admin or content editor approves them.</p>
        </div>
        {courses.length > 1 && (
          <nav className="tabs" aria-label="Your courses">
            {courses.map((c) => (
              <Link key={c.id} href={`/facilitator/quizzes?course=${c.slug}`} aria-current={c.id === active?.id ? "page" : undefined} style={{ padding: "10px 14px", fontWeight: 600, textDecoration: "none", color: c.id === active?.id ? "var(--accent)" : "var(--muted)", borderBottom: `2.5px solid ${c.id === active?.id ? "var(--accent)" : "transparent"}`, whiteSpace: "nowrap" }}>{c.title}</Link>
            ))}
          </nav>
        )}
        {!courses.length && <div className="panel"><p className="muted">You don’t teach any online courses yet. Quizzes belong to the online part of a course.</p></div>}
        {active && !quizzes.length && (
          <div className="panel stack"><h2 className="h3">No quizzes on {active.title} yet</h2><p className="muted">Suggest a quiz under Lessons in your menu. Once it’s approved, its results show here.</p></div>
        )}
        {quizzes.map((lz) => {
          const questions = ((contents ?? []).find((c) => c.lesson_id === lz.id)?.quiz ?? []) as QuizQuestion[];
          const tries = attempts.filter((a) => a.lesson_id === lz.id);
          const passed = (passes ?? []).filter((p) => p.lesson_id === lz.id);
          const triedBy = new Set(tries.map((a) => a.user_id));
          const struggling = learnerIds.filter((u) => !passed.some((p) => p.user_id === u) && tries.filter((a) => a.user_id === u).length >= 2);
          const avg = passed.length ? Math.round(passed.reduce((a, p) => a + (p.score ?? 0), 0) / passed.length) : null;
          // How often each question is answered correctly, over every attempt that recorded answers.
          const rate = questions.map((qq, i) => {
            const answered = tries.filter((a) => Array.isArray(a.answers) && a.answers.length > i);
            return answered.length ? Math.round((answered.filter((a) => a.answers[i] === qq.a).length / answered.length) * 100) : null;
          });
          return (
            <details key={lz.id} className="panel" open={lz.id === open}>
              <summary style={{ cursor: "pointer" }}>
                <span className="row" style={{ justifyContent: "space-between", gap: 10, display: "inline-flex", width: "calc(100% - 24px)" }}>
                  <b>{lz.title}</b>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="badge b-good">{passed.length}/{learnerIds.length} passed</span>
                    {avg !== null && <span className="badge b-short">avg {avg}%</span>}
                    {struggling.length > 0 && <span className="badge b-warn">{struggling.length} struggling</span>}
                    <span className="badge b-short">{questions.length} questions</span>
                  </span>
                </span>
              </summary>
              <div className="grid g2" style={{ marginTop: 14, alignItems: "start" }}>
                <div className="stack" style={{ gap: 10 }}>
                  <h3 style={{ fontSize: "1.05rem" }}>Learners</h3>
                  <div className="tscroll" tabIndex={0}>
                    <table className="tbl">
                      <thead><tr><th>Learner</th><th>Result</th><th>Attempts</th><th>Last try</th></tr></thead>
                      <tbody>
                        {learnerIds.map((u) => {
                          const mine = tries.filter((a) => a.user_id === u);
                          const pass = passed.find((p) => p.user_id === u);
                          return (
                            <tr key={u}>
                              <td>{name(u)}</td>
                              <td>{pass ? <span className="badge b-good">Passed {pass.score}%</span> : mine.length ? <span className="badge b-warn">Not yet · best {Math.max(...mine.map((a) => a.score))}%</span> : <span className="badge b-short">Not tried</span>}</td>
                              <td className="tnum">{mine.length || (pass ? 1 : 0)}</td>
                              <td className="small">{mine[0] ? day(mine[0].created_at) : pass ? day(pass.completed_at) : "—"}</td>
                            </tr>
                          );
                        })}
                        {!learnerIds.length && <tr><td colSpan={4} className="muted">No learners enrolled yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {questions.length > 0 && (
                    <>
                      <h3 style={{ fontSize: "1.05rem", marginTop: 6 }}>Questions, hardest first</h3>
                      {!triedBy.size && <p className="small muted">Shows once learners start attempting this quiz.</p>}
                      {triedBy.size > 0 && questions.map((qq, i) => ({ qq, i, r: rate[i] })).sort((a, b) => (a.r ?? 101) - (b.r ?? 101)).map(({ qq, i, r }) => (
                        <div key={i} className="row" style={{ justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                          <span className="small">{i + 1}. {qq.q}</span>
                          <span className={`badge ${r !== null && r < 60 ? "b-bad" : "b-good"}`}>{r === null ? "—" : `${r}% right`}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <h3 style={{ fontSize: "1.05rem" }}>Reviewing answers</h3>
                  <ReviewSetting lesson={lz.id} value={((contents ?? []).find((c) => c.lesson_id === lz.id)?.quiz_review as string) ?? "full"} />
                  <h3 style={{ fontSize: "1.05rem", marginTop: 8 }}>Change the questions</h3>
                  {role === "facilitator" ? (
                    <>
                      <p className="small muted">Your changes go to an admin or content editor for approval before learners see them.</p>
                      <ProposalForm courseId={active!.id} lesson={lz} quizText={quizToText(questions)} submitLabel="Send changes for approval" />
                    </>
                  ) : canEdit ? <QuizEditForm lesson={lz.id} text={quizToText(questions)} /> : <p className="small muted">Ask a content editor to change these questions.</p>}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
