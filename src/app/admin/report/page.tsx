import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Employer progress report" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

/** Printable progress and completion report for an employer that paid for staff training. */
export default async function EmployerReport({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { company } = await searchParams;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin/report");
  if (!["admin", "sales"].includes(profile?.role ?? "")) redirect("/");
  const { data: companies } = await supabase.from("enrolments").select("company").not("company", "is", null);
  const names = [...new Set((companies ?? []).map((c) => c.company as string))].sort();
  const chosen = company ?? names[0];

  type E = { id: string; user_id: string; created_at: string; result: string | null; assessed_at: string | null; courses: { title: string; code: string; has_lms: boolean; certificate_auto: boolean; modules: { lessons: { id: string }[] }[] } };
  const { data: enrols } = chosen
    ? await supabase.from("enrolments").select("id, user_id, created_at, result, assessed_at, courses(title, code, has_lms, certificate_auto, modules(lessons(id)))").eq("company", chosen)
    : { data: [] };
  const rows = (enrols ?? []) as unknown as E[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const [{ data: profs }, { data: prog }] = ids.length
    ? await Promise.all([supabase.from("profiles").select("id, full_name").in("id", ids), supabase.from("lesson_progress").select("user_id, lesson_id, completed_at").in("user_id", ids)])
    : [{ data: [] }, { data: [] }];
  const name = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
  const lines = rows.map((r) => {
    const lessonIds = r.courses.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const mine = (prog ?? []).filter((p) => p.user_id === r.user_id && lessonIds.includes(p.lesson_id));
    const pct = lessonIds.length ? Math.round((mine.length / lessonIds.length) * 100) : null;
    const last = mine.map((p) => p.completed_at as string).sort().at(-1);
    const status = r.result === "competent" ? "Competent" : r.result === "not_yet_competent" ? "Not yet competent" : pct === 100 && r.courses.certificate_auto ? "Completed" : pct === null ? "Classroom: awaiting assessment" : pct === 0 ? "Not started" : "In progress";
    return { ...r, learner: name.get(r.user_id) ?? "Learner", pct, last, status };
  }).sort((a, b) => a.learner.localeCompare(b.learner));
  const completed = lines.filter((l) => ["Competent", "Completed"].includes(l.status)).length;

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18, maxWidth: 980 }}>
        <div className="row no-print" style={{ justifyContent: "space-between" }}>
          <Link href="/admin?tab=learners">← Learners & progress</Link>
          <form className="row" style={{ gap: 8 }} action="/admin/report">
            <select name="company" defaultValue={chosen} aria-label="Employer" style={{ padding: "7px 9px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
              {names.map((n) => <option key={n}>{n}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm">Show</button>
            <PrintButton label="Print / save as PDF" />
          </form>
        </div>
        <div className="panel stack" style={{ gap: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Training Africa Academy · Employer progress report</div>
              <h1 style={{ fontSize: "1.8rem", marginTop: 6 }}>{chosen ?? "No employer enrolments yet"}</h1>
              <p className="small muted">Prepared {day(new Date().toISOString())} · shared with the employer as agreed when the learners were enrolled</p>
            </div>
            <div className="kpis" style={{ minWidth: 360, flex: "0 1 400px" }}>
              <div className="card kpi"><div className="eyebrow">Learners</div><div className="v tnum">{new Set(lines.map((l) => l.user_id)).size}</div></div>
              <div className="card kpi"><div className="eyebrow">Completed</div><div className="v tnum">{completed}/{lines.length}</div></div>
            </div>
          </div>
          <div className="tscroll" tabIndex={0}>
            <table className="tbl">
              <thead><tr><th>Learner</th><th>Course</th><th>Enrolled</th><th>Online progress</th><th>Last activity</th><th>Status</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td><b>{l.learner}</b></td>
                    <td>{l.courses.title}<br /><span className="mono small muted">{l.courses.code}</span></td>
                    <td className="small">{day(l.created_at)}</td>
                    <td className="tnum">{l.pct === null ? "—" : `${l.pct}%`}</td>
                    <td className="small">{l.last ? day(l.last) : "—"}</td>
                    <td><span className={`badge ${["Competent", "Completed"].includes(l.status) ? "b-good" : l.status === "Not yet competent" ? "b-warn" : "b-short"}`}>{l.status}</span>{l.assessed_at ? <div className="small muted">assessed {day(l.assessed_at)}</div> : null}</td>
                  </tr>
                ))}
                {!lines.length && <tr><td colSpan={6} className="muted">No learners linked to this employer. Add the employer name when giving a learner course access.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="small muted">Contains personal information shared under the employer training agreement. Do not forward outside the employer&apos;s HR or training team.</p>
        </div>
      </div>
    </section>
  );
}
