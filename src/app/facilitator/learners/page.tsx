import Link from "next/link";
import { redirect } from "next/navigation";
import { KindBadge } from "@/components/CourseBits";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { homeFor } from "@/lib/roles";
import AssessForm from "../AssessForm";
import Evidence from "../Evidence";

export const metadata = { title: "My learners" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
const SOURCE: Record<string, string> = { checkout: "Paid online", admin: "Enrolled by Academy", employer: "Employer" };

type C = Course & { modules: { position: number; lessons: { id: string; kind: string; position: number }[] }[] };

export default async function LearnersPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator/learners");
  const role = profile?.role ?? "learner";
  if (role !== "facilitator" && role !== "admin") redirect(homeFor(role));

  // Facilitators see the courses assigned to them; admins see every course.
  let courseIds: string[] | null = null;
  if (role === "facilitator") {
    const { data: mine } = await supabase.from("course_facilitators").select("course_id").eq("user_id", user.id);
    courseIds = (mine ?? []).map((m) => m.course_id);
  }
  let q = supabase.from("courses").select("*, modules(position, lessons(id, kind, position))").order("title");
  if (courseIds) q = q.in("id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: courseRows } = await q;
  const courses = (courseRows ?? []) as unknown as C[];

  const ids = courses.map((c) => c.id);
  const { data: enrolRows } = ids.length
    ? await supabase.from("enrolments").select("id, user_id, course_id, source, created_at, result, result_note, assessed_at, moderation, moderation_note, poe_submitted_at").in("course_id", ids)
    : { data: [] };
  const enrols = enrolRows ?? [];
  const userIds = [...new Set(enrols.map((e) => e.user_id))];
  const [{ data: profs }, { data: prog }] = userIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", userIds),
        supabase.from("lesson_progress").select("user_id, lesson_id, score, completed_at").in("user_id", userIds),
      ])
    : [{ data: [] }, { data: [] }];
  const person = new Map((profs ?? []).map((p) => [p.id, p]));

  const stats = (c: C, uid: string) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    const lessonIds = new Set(lessons.map((l) => l.id));
    const mine = (prog ?? []).filter((p) => p.user_id === uid && lessonIds.has(p.lesson_id));
    const scores = mine.map((p) => p.score).filter((s): s is number => s != null);
    return {
      pct: lessons.length ? Math.round((mine.length / lessons.length) * 100) : null,
      quiz: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      last: mine.map((p) => p.completed_at as string).sort().at(-1) ?? null,
    };
  };

  const { data: evRows } = enrols.length ? await supabase.from("assessment_evidence").select("enrolment_id, path, name").in("enrolment_id", enrols.map((e) => e.id)) : { data: [] };
  const evidence = new Map<string, { name: string; url: string | null }[]>();
  for (const ev of evRows ?? []) {
    const { data: signed } = await supabase.storage.from("evidence").createSignedUrl(ev.path, 60 * 30);
    evidence.set(ev.enrolment_id, [...(evidence.get(ev.enrolment_id) ?? []), { name: ev.name, url: signed?.signedUrl ?? null }]);
  }
  const all = enrols.map((e) => {
    const c = courses.find((x) => x.id === e.course_id)!;
    return { ...e, course: c, ...stats(c, e.user_id) };
  });
  const slug = (await searchParams).course ?? courses[0]?.slug;
  const active = courses.find((c) => c.slug === slug) ?? courses[0];
  const rows = all.filter((r) => r.course_id === active?.id).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 20 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Teaching workspace</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>My learners</h1>
          </div>
          <span className="small muted">{courses.length} {courses.length === 1 ? "course" : "courses"} · {new Set(all.map((r) => r.user_id)).size} learners</span>
        </div>

        {!courses.length ? (
          <div className="panel stack">
            <h2 className="h3">No courses assigned yet</h2>
            <p className="muted">An administrator assigns facilitators to courses under Admin → Staff and roles.</p>
          </div>
        ) : (
          <>
            <nav className="tabs" aria-label="Your courses">
              {courses.map((c) => (
                <Link key={c.id} href={`/facilitator/learners?course=${c.slug}`} aria-current={c.id === active?.id ? "page" : undefined} style={{ padding: "10px 14px", fontWeight: 600, textDecoration: "none", color: c.id === active?.id ? "var(--accent)" : "var(--muted)", borderBottom: `2.5px solid ${c.id === active?.id ? "var(--accent)" : "transparent"}`, whiteSpace: "nowrap" }}>
                  {c.title} <span className="tnum small">({all.filter((r) => r.course_id === c.id).length})</span>
                </Link>
              ))}
            </nav>
            {active && (
              <div className="stack" style={{ gap: 12 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ gap: 8 }}><KindBadge course={active} /><span className="small muted">{active.has_lms ? `${active.modules.flatMap((m) => m.lessons).length} online lessons` : "Classroom / practical programme"}</span></div>
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="btn btn-primary btn-sm" href={`/facilitator/attendance?course=${active.slug}`}>Attendance register</Link>
                    {active.has_lms && <Link className="btn btn-ghost btn-sm" href={`/courses/${active.slug}`}>Course page</Link>}
                  </div>
                </div>
                <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
                  <table className="tbl">
                    <thead><tr><th>Learner</th><th>Enrolled</th>{active.has_lms && <><th>Progress</th><th>Quiz avg</th><th>Last active</th></>}<th>Assessment result</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} id={`e-${r.id}`}>
                          <td><b>{person.get(r.user_id)?.full_name ?? "Learner"}</b><br /><span className="small muted">{person.get(r.user_id)?.phone ?? ""}</span></td>
                          <td className="small">{day(r.created_at)}<br /><span className="muted">{SOURCE[r.source] ?? r.source}</span></td>
                          {active.has_lms && (
                            <>
                              <td style={{ minWidth: 120 }}>
                                <div className="small tnum">{r.pct}%</div>
                                <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${r.pct}%` }} /></div>
                              </td>
                              <td className="tnum">{r.quiz != null ? `${r.quiz}%` : "—"}</td>
                              <td className="small">{r.last ? day(r.last) : "Not started"}</td>
                            </>
                          )}
                          <td>
                            {active.certificate_auto && active.has_lms ? (
                              <span className={`badge ${r.pct === 100 ? "b-good" : "b-short"}`}>{r.pct === 100 ? "Certificate issued" : "Auto certificate at 100%"}</span>
                            ) : (
                              <>
                                {r.result && <div className="small muted" style={{ marginBottom: 6 }}>Recorded {r.assessed_at ? day(r.assessed_at) : ""}</div>}
                                <AssessForm enrolment={r.id} result={r.result} note={r.result_note} />
                                <Evidence courseId={r.course_id} enrolmentId={r.id} files={evidence.get(r.id) ?? []} />
                                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                                  <Link className="small" href={`/poe/${r.id}`}>Open portfolio{r.poe_submitted_at ? " (learner signed)" : ""}</Link>
                                  {r.moderation && <span className={`badge ${r.moderation === "endorsed" ? "b-good" : r.moderation === "referred" ? "b-bad" : "b-short"}`}>{r.moderation === "endorsed" ? "Moderated" : r.moderation === "referred" ? "Referred back" : "With moderator"}</span>}
                                </div>
                                {r.moderation === "referred" && r.moderation_note && <p className="small" style={{ color: "var(--bad)" }}>Moderator: {r.moderation_note}</p>}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!rows.length && <tr><td colSpan={6} className="muted">No learners enrolled on this course yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {active.certificate_auto && active.has_lms && (
                  <p className="small muted">This short course issues its certificate automatically when a learner finishes every lesson. Accredited and classroom programmes need your result above.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
