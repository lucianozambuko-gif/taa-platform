import Link from "next/link";
import { redirect } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import { listCourses } from "@/lib/courses";
import { employerStaff } from "@/lib/employer";
import { rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "My staff" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

/** Employer / HR portal: live progress and results for the company's own staff, plus B-BBEE spend and bulk registration. */
export default async function EmployerPortal() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/employer");
  const { data: me } = await supabase.from("profiles").select("company, role").eq("id", user.id).single();
  if (profile?.role !== "employer" || !me?.company)
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack">
        <h1 style={{ fontSize: "1.6rem" }}>Employer access</h1>
        <p className="muted">This area is for HR and training managers whose company sends staff to the Academy. Ask your Academy contact to link your account to your company.</p>
        <div><Link className="btn btn-primary" href="/employers">Training for employers</Link></div>
      </div></div></section>
    );
  const company = me.company;
  const [rows, courses] = await Promise.all([employerStaff(supabase, company), listCourses()]);
  const people = new Set(rows.map((r) => r.user_id)).size;
  const done = rows.filter((r) => ["Competent", "Completed"].includes(r.status)).length;
  const spend = rows.reduce((a, r) => a + (r.price_cents ?? 0), 0);
  const accreditedSpend = rows.filter((r) => r.kind !== "short").reduce((a, r) => a + (r.price_cents ?? 0), 0);
  const byCourse = [...new Set(rows.map((r) => r.course))].map((c) => {
    const rs = rows.filter((r) => r.course === c);
    return { course: c, kind: rs[0].kind, learners: rs.length, completed: rs.filter((r) => ["Competent", "Completed"].includes(r.status)).length, spend: rs.reduce((a, r) => a + (r.price_cents ?? 0), 0) };
  });

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 20 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Employer portal</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>{company}: staff training</h1>
          </div>
          <span className="small muted">Signed in as {profile?.full_name ?? user.email}</span>
        </div>

        <div className="kpis">
          <div className="card kpi"><div className="eyebrow">Staff in training</div><div className="v tnum">{people}</div><div className="d">{rows.length} enrolments</div></div>
          <div className="card kpi"><div className="eyebrow">Completed or competent</div><div className="v tnum">{done}</div><div className="d">of {rows.length}</div></div>
          <div className="card kpi"><div className="eyebrow">Training spend</div><div className="v tnum">{rand(spend)}</div><div className="d">at list price</div></div>
          <div className="card kpi"><div className="eyebrow">Accredited spend</div><div className="v tnum">{rand(accreditedSpend)}</div><div className="d">for skills development</div></div>
        </div>

        <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
          <div className="row" style={{ justifyContent: "space-between", padding: "6px 4px" }}>
            <h3>Progress and results</h3>
            <a className="btn btn-ghost btn-sm" href="/employer/export">Download CSV</a>
          </div>
          <table className="tbl">
            <thead><tr><th>Staff member</th><th>Course</th><th>Enrolled</th><th>Online progress</th><th>Attendance</th><th>Last activity</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.learner}</b></td>
                  <td>{r.course}<br /><span className="mono small muted">{r.code}</span></td>
                  <td className="small">{day(r.enrolled)}</td>
                  <td style={{ minWidth: 110 }}>{r.pct === null ? <span className="small muted">Classroom</span> : <><div className="small tnum">{r.pct}%</div><div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${r.pct}%` }} /></div></>}</td>
                  <td className="small tnum">{r.sessions ? `${r.attended}/${r.sessions} days` : "—"}</td>
                  <td className="small">{r.last ? day(r.last) : "—"}</td>
                  <td><span className={`badge ${["Competent", "Completed"].includes(r.status) ? "b-good" : r.status === "Not yet competent" ? "b-warn" : "b-short"}`}>{r.status}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="muted">No staff enrolled yet. Register them below.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel stack" style={{ gap: 10 }} id="bbbee">
          <h3>B-BBEE skills development summary</h3>
          <p className="small muted">Training spend and outcomes for your skills development scorecard. Your verification agent adds each learner&apos;s demographic details; the Academy does not collect race or disability information.</p>
          <div className="tscroll" tabIndex={0}>
            <table className="tbl">
              <thead><tr><th>Course</th><th>Type</th><th>Learners</th><th>Completed / competent</th><th>Spend (list price)</th></tr></thead>
              <tbody>
                {byCourse.map((c) => (
                  <tr key={c.course}><td>{c.course}</td><td>{c.kind === "short" ? "Skills programme (non-accredited)" : "Accredited"}</td><td className="tnum">{c.learners}</td><td className="tnum">{c.completed}</td><td className="tnum">{rand(c.spend)}</td></tr>
                ))}
                <tr><td><b>Total</b></td><td></td><td className="tnum"><b>{rows.length}</b></td><td className="tnum"><b>{done}</b></td><td className="tnum"><b>{rand(spend)}</b></td></tr>
              </tbody>
            </table>
          </div>
          <div><a className="btn btn-ghost btn-sm" href="/employer/export?type=bbbee">Download for your verification agent (CSV)</a></div>
        </div>

        <div className="grid g2" style={{ alignItems: "start" }} id="register">
          <LeadForm type="multi_learner" source="employer_portal" submitLabel="Send staff list" successTitle="Staff list received" successText="{team} will enrol them and each person gets a link to set their password.">
            <h3>Register more staff</h3>
            <p className="small muted">Paste from Excel: one person per line as name, email, phone.</p>
            <input type="hidden" name="company" value={company} />
            <input type="hidden" name="name" value={profile?.full_name ?? "Employer"} />
            <input type="hidden" name="email" value={user.email ?? ""} />
            <div className="field">
              <label htmlFor="ep-course">Course</label>
              <select id="ep-course" name="course" required defaultValue="">
                <option value="" disabled>Choose a course</option>
                {courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="ep-learners">Staff</label><textarea id="ep-learners" name="learners" rows={5} required placeholder={"Sipho Dlamini, sipho@company.co.za, 082 123 4567"} /></div>
          </LeadForm>
          <div className="panel stack" style={{ gap: 10 }}>
            <h3>Need a quote for a new group?</h3>
            <p className="muted small">Use the instant estimate, then send it to us as a quote request.</p>
            <div><Link className="btn btn-primary" href="/employers#estimate">Get an instant estimate</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}
