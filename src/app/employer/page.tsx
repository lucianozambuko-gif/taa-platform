import Link from "next/link";
import { redirect } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import { listCourses } from "@/lib/courses";
import { employerStaff } from "@/lib/employer";
import { rand } from "@/lib/format";
import TrackedLink from "@/components/TrackedLink";
import { getUserAndProfile } from "@/lib/supabase/server";
import { QuickLinks, Tile, TodoList, WorkHead, today, type Todo } from "@/components/WorkBits";
import { LEAD_LABEL } from "@/lib/format";
import { homeFor } from "@/lib/roles";

export const metadata = { title: "My staff" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

/** Employer / HR portal: live progress and results for the company's own staff, plus B-BBEE spend and bulk registration. */
export default async function EmployerPortal({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/employer");
  const { data: me } = await supabase.from("profiles").select("company, role").eq("id", user.id).single();
  if (profile?.role !== "employer") redirect(homeFor(profile?.role));
  if (!me?.company)
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

  const sp = await searchParams;
  const view = ["staff", "register", "requests", "reports"].includes(sp.view ?? "") ? sp.view! : "overview";
  // Status of the requests this company sent (needs database function employer_requests, migration 0016).
  type Req = { ref: string; type: string; status: string; course: string | null; staff_count: number | null; created_at: string; updated_at: string | null };
  const reqRes = await supabase.rpc("employer_requests").then((r) => r, () => ({ data: null, error: { message: "unavailable" } }));
  const requests = (reqRes.error ? [] : (reqRes.data ?? [])) as Req[];
  const requestsOn = !reqRes.error;
  const openReqs = requests.filter((r) => !["won", "lost"].includes(r.status));
  const REQ: Record<string, [string, string]> = { new: ["Received", "b-warn"], contacted: ["Being processed", "b-short"], quoted: ["Quote sent", "b-acc"], won: ["Completed", "b-good"], lost: ["Closed", "b-short"] };

  const staffTable = (
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
  );
  const head = (title: string) => (
    <WorkHead eyebrow={`Employer portal · ${company}`} title={title} />
  );

  if (view === "staff") return <>{head("My staff: progress and results")}{staffTable}</>;

  if (view === "reports")
    return (
      <>
        {head("Reports and B-BBEE")}
        <div className="stat-tiles">
          <Tile href="/employer?view=staff" value={people} label="staff in training" />
          <Tile href="/employer?view=staff" value={`${done}/${rows.length}`} label="completed or competent" />
          <Tile href="/employer?view=reports" value={rand(spend)} label="training spend (list price)" />
          <Tile href="/employer?view=reports" value={rand(accreditedSpend)} label="accredited spend" />
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
        <div className="panel row" style={{ justifyContent: "space-between" }}>
          <span><b>Progress and completion report</b><br /><span className="small muted">Every staff member, course, progress, attendance and result.</span></span>
          <a className="btn btn-ghost btn-sm" href="/employer/export">Download CSV</a>
        </div>
      </>
    );

  if (view === "register")
    return (
      <>
        {head("Register staff")}
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
      </>
    );

  if (view === "requests")
    return (
      <>
        {head("Requests and quotes")}
        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">Sent to the Academy</h2>
          {requestsOn ? (
            <div className="tscroll" tabIndex={0}>
              <table className="tbl">
                <thead><tr><th>Reference</th><th>Request</th><th>Course</th><th>Staff</th><th>Sent</th><th>Status</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.ref}>
                      <td className="mono small">{r.ref}</td>
                      <td>{LEAD_LABEL[r.type] ?? r.type}</td>
                      <td className="small">{r.course ?? "—"}</td>
                      <td className="tnum">{r.staff_count ?? "—"}</td>
                      <td className="small">{day(r.created_at)}</td>
                      <td><span className={`badge ${(REQ[r.status] ?? REQ.new)[1]}`}>{(REQ[r.status] ?? REQ.new)[0]}</span></td>
                    </tr>
                  ))}
                  {!requests.length && <tr><td colSpan={6} className="muted">Nothing sent yet. Staff lists and quote requests you send appear here with their status.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="small muted">Your Academy contact confirms each staff list and quote by email. Quote the reference from your confirmation message if you need to follow up.</p>
          )}
        </div>
        <div className="grid g2" style={{ alignItems: "start" }}>
          <div className="panel stack" style={{ gap: 10 }}>
            <h3>Quote for a new group</h3>
            <p className="muted small">Corporate training is priced by quotation. Build an instant estimate, then send it to us as a quote request.</p>
            <div><Link className="btn btn-primary" href="/employers#estimate">Get an instant estimate</Link></div>
          </div>
          <div className="panel stack" style={{ gap: 10 }}>
            <h3>Invoices</h3>
            <p className="muted small">Group training is invoiced to your company by the Academy&apos;s accounts team after the quote is accepted. Ask for a copy or a statement on WhatsApp.</p>
            <div><a className="btn btn-ghost" href="/api/wa?team=sales&m=Hi%2C%20please%20send%20our%20latest%20invoice%20or%20statement." target="_blank" rel="noopener">Ask for an invoice or statement</a></div>
          </div>
        </div>
      </>
    );

  const notStarted = rows.filter((r) => r.status === "Not started");
  const nyc = rows.filter((r) => r.status === "Not yet competent");
  const active = rows.filter((r) => r.status === "In progress" || r.status === "Classroom");
  const todos: Todo[] = [];
  if (notStarted.length) todos.push({ key: "ns", n: notStarted.length, title: `${notStarted.length === 1 ? "staff member has" : "staff members have"} not started their online course`, detail: notStarted.slice(0, 3).map((r) => r.learner).join(", "), href: "/employer?view=staff", cta: "See who" });
  if (nyc.length) todos.push({ key: "nyc", n: nyc.length, tone: "bad", title: `${nyc.length === 1 ? "result is" : "results are"} “not yet competent”`, detail: "The facilitator will arrange a re-assessment", href: "/employer?view=staff", cta: "View" });
  if (openReqs.length) todos.push({ key: "req", n: openReqs.length, title: `${openReqs.length === 1 ? "request is" : "requests are"} with the Academy`, detail: openReqs.slice(0, 2).map((r) => `${r.ref} · ${(REQ[r.status] ?? REQ.new)[0]}`).join(" · "), href: "/employer?view=requests", cta: "Track" });
  if (!rows.length) todos.push({ key: "first", title: "Register your first group of staff", detail: "Paste names from Excel; the Academy enrols them for you", href: "/employer?view=register", cta: "Register" });

  return (
    <>
      <WorkHead eyebrow={today()} title={`${company}: staff training`}>
        <Link className="btn btn-primary btn-sm" href="/employer?view=register">Register staff</Link>
      </WorkHead>
      <div className="stat-tiles">
        <Tile href="/employer?view=staff" value={people} label="staff in training" />
        <Tile href="/employer?view=staff" value={active.length} label="courses in progress" />
        <Tile href="/employer?view=staff" value={`${done}/${rows.length}`} label="completed or competent" />
        <Tile href="/employer?view=reports" value={rand(spend)} label="training spend (list price)" />
      </div>
      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <TodoList todos={todos} title="Needs your attention" empty="Everyone is on track. Progress updates appear here as your staff learn." />
          <div className="panel stack" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h3">Progress by course</h2>
              <Link className="small" href="/employer?view=staff">Every staff member →</Link>
            </div>
            {byCourse.map((c) => (
              <div key={c.course} className="mini-course" style={{ gridTemplateColumns: "1fr auto" }}>
                <span style={{ minWidth: 0 }}>
                  <b>{c.course}</b><br />
                  <span className="small muted">{c.learners} enrolled · {c.completed} completed or competent</span>
                  <div className="bar" style={{ marginTop: 6, maxWidth: 260 }}><i style={{ width: `${c.learners ? Math.round((c.completed / c.learners) * 100) : 0}%` }} /></div>
                </span>
                <span className="badge b-short">{c.kind === "short" ? "Skills programme" : "Accredited"}</span>
              </div>
            ))}
            {!byCourse.length && <p className="small muted">No staff enrolled yet.</p>}
          </div>
        </div>
        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">Downloads</div>
            <a className="btn btn-ghost btn-sm" href="/employer/export" style={{ justifyContent: "flex-start" }}>Progress report (CSV)</a>
            <a className="btn btn-ghost btn-sm" href="/employer/export?type=bbbee" style={{ justifyContent: "flex-start" }}>B-BBEE skills summary (CSV)</a>
            <TrackedLink className="btn btn-ghost btn-sm" href={process.env.NEXT_PUBLIC_CORPORATE_BROCHURE_URL || "/corporate-brochure.pdf"} target="_blank" rel="noopener" event="brochure_download" params={{ item: "corporate brochure (employer portal)" }} style={{ justifyContent: "flex-start" }}>Corporate brochure (PDF)</TrackedLink>
          </div>
          <QuickLinks title="Plan more training" links={[["/employers#estimate", "Instant group estimate"], ["/courses?learner=employer", "Browse courses for teams"], ["/venue", "Assessment centre and venue hire"]]} />
        </aside>
      </div>
    </>
  );
}
