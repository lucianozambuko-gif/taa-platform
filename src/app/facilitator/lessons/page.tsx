import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { quizToText } from "@/lib/quizText";
import type { QuizQuestion } from "@/lib/types";
import ProposalForm from "./ProposalForm";
import { withdrawProposal } from "./actions";

export const metadata = { title: "Lessons" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { video: "Video", quiz: "Quiz", download: "Download" };
const STATUS: Record<string, [string, string]> = { pending: ["b-warn", "Waiting for approval"], approved: ["b-good", "Approved · live"], rejected: ["b-bad", "Not approved"], withdrawn: ["b-short", "Withdrawn"] };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });

/** Facilitators see each course's lessons and suggest new lessons, quizzes and changes, which an admin or content editor approves. */
export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator/lessons");
  if (!["facilitator", "admin"].includes(profile?.role ?? "")) redirect("/");
  const sp = await searchParams;
  let ids: string[] | null = null;
  if (profile?.role === "facilitator") ids = ((await supabase.from("course_facilitators").select("course_id").eq("user_id", user.id)).data ?? []).map((r) => r.course_id);
  let q = supabase.from("courses").select("id, title, slug, has_lms, modules(id, title, position, lessons(id, title, kind, minutes, position))").order("title");
  if (ids) q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  type C = { id: string; title: string; slug: string; has_lms: boolean; modules: { id: string; title: string; position: number; lessons: { id: string; title: string; kind: string; minutes: number; position: number }[] }[] };
  const courses = ((await q).data ?? []) as unknown as C[];
  const active = courses.find((c) => c.slug === sp.course) ?? courses.find((c) => c.has_lms) ?? courses[0];
  const modules = active ? [...active.modules].sort((a, b) => a.position - b.position).map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.position - b.position) })) : [];
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [{ data: contents }, { data: mine }] = await Promise.all([
    lessonIds.length ? supabase.from("lesson_content").select("lesson_id, video_url, captions_url, download_url, body, quiz").in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
    supabase.from("lesson_proposals").select("id, course_id, action, title, kind, status, review_note, created_at, reviewed_at").eq("proposed_by", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const content = (id: string) => (contents ?? []).find((c) => c.lesson_id === id);

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Lessons</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Lessons and quizzes</h1>
            <p className="muted" style={{ marginTop: 6, maxWidth: 760 }}>Suggest new lessons, quizzes or changes for the courses you teach. An admin or content editor checks each one before learners see it, and you’re notified of the decision.</p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/facilitator/quizzes">Quiz results</Link>
        </div>
        {courses.length > 1 && (
          <nav className="tabs" aria-label="Your courses">
            {courses.map((c) => (
              <Link key={c.id} href={`/facilitator/lessons?course=${c.slug}`} aria-current={c.id === active?.id ? "page" : undefined} style={{ padding: "10px 14px", fontWeight: 600, textDecoration: "none", color: c.id === active?.id ? "var(--accent)" : "var(--muted)", borderBottom: `2.5px solid ${c.id === active?.id ? "var(--accent)" : "transparent"}`, whiteSpace: "nowrap" }}>{c.title}</Link>
            ))}
          </nav>
        )}
        {!active && <div className="panel"><p className="muted">No courses assigned to you yet.</p></div>}
        {active && (
          <div className="grid g2" style={{ alignItems: "start" }}>
            <div className="stack" style={{ gap: 12 }}>
              <h2 className="h3">Course outline</h2>
              {!active.has_lms && <p className="small muted">This course has no online part yet. Your first approved lesson switches it on.</p>}
              {modules.map((m, mi) => (
                <div key={m.id} className="panel stack" style={{ gap: 6 }}>
                  <b>Module {mi + 1}: {m.title}</b>
                  {m.lessons.map((l) => {
                    const c = content(l.id);
                    return (
                      <details key={l.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 6 }}>
                        <summary style={{ cursor: "pointer" }} className="row">
                          <span style={{ flex: 1 }}>{l.title}</span>
                          <span className="badge b-short">{KIND[l.kind]} · {l.minutes} min</span>
                        </summary>
                        <div style={{ padding: "10px 0 4px" }}>
                          <p className="small muted" style={{ marginBottom: 8 }}>Suggest changes to this lesson:</p>
                          <ProposalForm courseId={active.id} lesson={l} content={c} quizText={quizToText((c?.quiz ?? []) as QuizQuestion[])} submitLabel="Send changes for approval" />
                        </div>
                      </details>
                    );
                  })}
                  {!m.lessons.length && <p className="small muted">No lessons in this module yet.</p>}
                </div>
              ))}
            </div>
            <div className="stack" style={{ gap: 12 }}>
              <div className="panel stack" style={{ gap: 10 }} id="new">
                <h2 className="h3">Suggest a new lesson or quiz</h2>
                <ProposalForm courseId={active.id} modules={modules.map((m) => ({ id: m.id, title: m.title }))} />
              </div>
              <div className="panel stack" style={{ gap: 8 }}>
                <h2 className="h3">My suggestions</h2>
                {(mine ?? []).map((p) => (
                  <div key={p.id} className="stack" style={{ gap: 4, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                      <span><b>{p.title}</b> <span className="small muted">· {p.action === "new_lesson" ? "new" : "changes"} · {KIND[p.kind]} · {courses.find((c) => c.id === p.course_id)?.title ?? ""} · {day(p.created_at)}</span></span>
                      <span className={`badge ${STATUS[p.status][0]}`}>{STATUS[p.status][1]}</span>
                    </div>
                    {p.review_note && <p className="small" style={{ color: p.status === "rejected" ? "var(--bad)" : "var(--muted)" }}>Reviewer: {p.review_note}</p>}
                    {p.status === "pending" && (
                      <form action={withdrawProposal}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">Withdraw</button></form>
                    )}
                  </div>
                ))}
                {!(mine ?? []).length && <p className="small muted">Nothing sent yet.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
