import Link from "next/link";
import { redirect } from "next/navigation";
import { KindBadge } from "@/components/CourseBits";
import { LEAD_LABEL, rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { assignCourse, setUserRole, togglePublished, unassignFacilitator, updateLeadStatus, updatePrice } from "./actions";
import EnrolForm from "./EnrolForm";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS: [string, string][] = [["overview", "Overview"], ["leads", "Leads"], ["orders", "Orders"], ["learners", "Learners & progress"], ["courses", "Courses"], ["users", "Users"], ["audit", "Audit log"]];
const STATUS_BADGE: Record<string, string> = { paid: "b-good", pending: "b-warn", failed: "b-bad", cancelled: "b-short", new: "b-warn" };
const date = (iso: string) => new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; role?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin");
  if (profile?.role !== "admin")
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack">
        <h1 style={{ fontSize: "1.6rem" }}>Admin access only</h1>
        <p className="muted">Your account doesn't have the admin role. An existing administrator can grant it (see the README).</p>
      </div></div></section>
    );
  const sp = await searchParams;
  const tab = sp.tab ?? "overview";
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  let body: React.ReactNode = null;
  if (tab === "overview") {
    const [{ data: leads }, { data: orders }, { count: learners }] = await Promise.all([
      supabase.from("leads").select("type, created_at").gte("created_at", since),
      supabase.from("orders").select("status, amount_cents, created_at").gte("created_at", since),
      supabase.from("enrolments").select("id", { count: "exact", head: true }),
    ]);
    const paid = (orders ?? []).filter((o) => o.status === "paid");
    const started = (orders ?? []).length;
    const abandonment = started ? Math.round(((started - paid.length) / started) * 100) : 0;
    const byType = Object.keys(LEAD_LABEL).map((t) => [LEAD_LABEL[t], (leads ?? []).filter((l) => l.type === t).length] as [string, number]);
    const max = Math.max(1, ...byType.map(([, n]) => n));
    const [{ data: enrolRows }, { data: allPaid }, { data: progRows }, { data: recentLeads }, { data: recentOrders }] = await Promise.all([
      supabase.from("enrolments").select("user_id, course_id, courses(title, modules(lessons(id)))"),
      supabase.from("orders").select("course_id, amount_cents").eq("status", "paid"),
      supabase.from("lesson_progress").select("user_id, lesson_id"),
      supabase.from("leads").select("ref, type, name, company, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("orders").select("invoice_no, status, amount_cents, created_at, courses(title)").order("created_at", { ascending: false }).limit(5),
    ]);
    const [{ data: people }, { data: audits }, { data: pendingResults }] = await Promise.all([
      supabase.rpc("admin_users"),
      supabase.from("audit_log").select("action, detail, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("enrolments").select("id, courses!inner(certificate_auto)").is("result", null).eq("courses.certificate_auto", false),
    ]);
    type P = { full_name: string | null; email: string; role: string; created_at: string };
    type AD = { code?: string; title?: string };
    const AUDIT: Record<string, string> = { price_change: "Price changed", publish: "Course published", unpublish: "Course hidden", lead_status: "Lead status updated", course_update: "Course edited", course_create: "Course added", admin_enrol: "Learner given access", assessment: "Assessment result recorded", role_change: "Role changed", facilitator_assign: "Facilitator assigned", facilitator_unassign: "Facilitator removed" };
    type ER = { user_id: string; course_id: string; courses: { title: string; modules: { lessons: { id: string }[] }[] } };
    const perfMap = new Map<string, { title: string; enrolled: number; completed: number; sales: number }>();
    for (const e of (enrolRows ?? []) as unknown as ER[]) {
      const row = perfMap.get(e.course_id) ?? { title: e.courses.title, enrolled: 0, completed: 0, sales: 0 };
      row.enrolled++;
      const ids = e.courses.modules.flatMap((m) => m.lessons.map((l) => l.id));
      if (ids.length && ids.every((id) => (progRows ?? []).some((p) => p.user_id === e.user_id && p.lesson_id === id))) row.completed++;
      perfMap.set(e.course_id, row);
    }
    for (const o of allPaid ?? []) { const r = perfMap.get(o.course_id); if (r) r.sales += o.amount_cents; }
    const perf = [...perfMap.values()].sort((a, b) => b.sales - a.sales);
    const activity = [
      ...(recentLeads ?? []).map((l) => ({ at: l.created_at, kind: "Lead", badge: "b-warn", text: `${l.ref} · ${LEAD_LABEL[l.type] ?? l.type} from ${l.company ?? l.name}` })),
      ...(recentOrders ?? []).map((o) => ({ at: o.created_at, kind: o.status === "paid" ? "Paid" : "Order", badge: o.status === "paid" ? "b-good" : "b-short", text: `${o.invoice_no} · ${(o.courses as unknown as { title: string }).title} · ${rand(o.amount_cents)}` })),
      ...((people ?? []) as P[]).slice(0, 5).map((u) => ({ at: u.created_at, kind: "Sign-up", badge: "b-short", text: `${u.full_name ?? u.email} created an account` })),
      ...(audits ?? []).map((a) => { const d = (a.detail ?? {}) as AD; return { at: a.created_at, kind: "Staff", badge: "b-short", text: `${AUDIT[a.action] ?? a.action}${d.title ? ` · ${d.title}` : d.code ? ` · ${d.code}` : ""}` }; }),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
    body = (
      <>
        <div className="kpis">
          <div className="card kpi"><div className="eyebrow">Enquiries</div><div className="v tnum">{leads?.length ?? 0}</div><div className="d">last 30 days</div></div>
          <div className="card kpi"><div className="eyebrow">Course sales</div><div className="v tnum">{rand(paid.reduce((a, o) => a + o.amount_cents, 0))}</div><div className="d">{paid.length} paid orders, 30 days</div></div>
          <div className="card kpi"><div className="eyebrow">Checkout abandonment</div><div className="v tnum">{abandonment}%</div><div className="d">{started - paid.length} of {started} checkouts unpaid</div></div>
          <div className="card kpi"><div className="eyebrow">Enrolled learners</div><div className="v tnum">{learners ?? 0}</div><div className="d">all time</div></div>
          <div className="card kpi"><div className="eyebrow">Accounts</div><div className="v tnum">{(people ?? []).length}</div><div className="d"><Link href="/admin?tab=users">Manage users →</Link></div></div>
          <div className="card kpi"><div className="eyebrow">Awaiting assessment</div><div className="v tnum">{(pendingResults ?? []).length}</div><div className="d">classroom and accredited results</div></div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Enquiries by type, last 30 days</h3>
          {byType.map(([label, n]) => (
            <div className="hbar" key={label}><span>{label}</span><div className="track"><i style={{ width: `${(n / max) * 100}%` }} /></div><span className="tnum">{n}</span></div>
          ))}
        </div>
        <div className="grid g2" style={{ marginTop: 16, alignItems: "start" }}>
          <div className="panel tscroll">
            <h3>Course performance</h3>
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead><tr><th>Course</th><th>Enrolled</th><th>Completed</th><th>Sales</th></tr></thead>
              <tbody>
                {perf.map((p) => (
                  <tr key={p.title}><td>{p.title}</td><td className="tnum">{p.enrolled}</td><td className="tnum">{p.completed}</td><td className="tnum">{rand(p.sales)}</td></tr>
                ))}
                {!perf.length && <tr><td colSpan={4} className="muted">No enrolments yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="panel stack">
            <h3>What’s happening on the site</h3>
            {activity.map((a, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 10, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <span className="small"><span className={`badge ${a.badge}`}>{a.kind}</span> {a.text}</span>
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>{date(a.at)}</span>
              </div>
            ))}
            {!activity.length && <p className="muted small">Sign-ups, orders, enquiries and staff changes appear here.</p>}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Brochure downloads and WhatsApp clicks are tracked in Google Analytics 4.</p>
      </>
    );
  } else if (tab === "learners") {
    const [{ data: enrols }, { data: courseList }, { data: prog }, { data: profs }] = await Promise.all([
      supabase.from("enrolments").select("id, user_id, source, created_at, result, courses(id, title, has_lms, modules(lessons(id)))").order("created_at", { ascending: false }).limit(200),
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("lesson_progress").select("user_id, lesson_id, completed_at"),
      supabase.from("profiles").select("id, full_name, phone"),
    ]);
    const nameOf = new Map((profs ?? []).map((p) => [p.id, p]));
    type E = { id: string; user_id: string; source: string; created_at: string; result: string | null; courses: { id: string; title: string; has_lms: boolean; modules: { lessons: { id: string }[] }[] } };
    const rows = ((enrols ?? []) as unknown as E[]).map((e) => {
      const ids = e.courses.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const mine = (prog ?? []).filter((p) => p.user_id === e.user_id && ids.includes(p.lesson_id));
      const last = mine.map((p) => p.completed_at).sort().at(-1);
      return { ...e, pct: ids.length ? Math.round((mine.length / ids.length) * 100) : null, last };
    });
    body = (
      <div className="stack" style={{ gap: 16 }}>
        <EnrolForm courses={courseList ?? []} />
        <div className="panel tscroll" style={{ padding: "6px 10px" }}>
          <table className="tbl">
            <thead><tr><th>Learner</th><th>Course</th><th>Enrolled</th><th>How</th><th>Progress</th><th>Result</th><th>Last activity</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{nameOf.get(r.user_id)?.full_name ?? "—"}</b><br /><span className="small muted">{nameOf.get(r.user_id)?.phone ?? ""}</span></td>
                  <td>{r.courses.title}</td>
                  <td className="small">{date(r.created_at)}</td>
                  <td>{r.source === "admin" ? "Admin" : r.source === "employer" ? "Employer" : "Online payment"}</td>
                  <td>{r.pct == null ? <span className="muted small">Classroom</span> : <span className={`badge ${r.pct === 100 ? "b-good" : "b-short"}`}>{r.pct === 100 ? "Completed" : `${r.pct}%`}</span>}</td>
                  <td>{r.result === "competent" ? <span className="badge b-good">Competent</span> : r.result === "not_yet_competent" ? <span className="badge b-warn">Not yet competent</span> : <span className="small muted">—</span>}</td>
                  <td className="small">{r.last ? date(r.last) : "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="muted">No enrolments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (tab === "users") {
    const [{ data: people }, { data: courseList }, { data: assigns }] = await Promise.all([
      supabase.rpc("admin_users"),
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("course_facilitators").select("course_id, user_id"),
    ]);
    type U = { id: string; email: string; full_name: string | null; phone: string | null; role: string; created_at: string; last_sign_in_at: string | null; enrolments: number };
    const everyone = (people ?? []) as U[];
    const q = (sp.q ?? "").trim().toLowerCase();
    const roleFilter = sp.role ?? "all";
    const list = everyone.filter((u) => (roleFilter === "all" || u.role === roleFilter) && (!q || `${u.full_name ?? ""} ${u.email} ${u.phone ?? ""}`.toLowerCase().includes(q)));
    const count = (r: string) => everyone.filter((u) => u.role === r).length;
    const titleOf = new Map((courseList ?? []).map((c) => [c.id, c.title]));
    const ROLE_LABEL: Record<string, string> = { learner: "Learner", facilitator: "Facilitator", admin: "Admin" };
    const sel = { padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" };
    body = (
      <div className="stack" style={{ gap: 16 }}>
        <div className="kpis">
          <div className="card kpi"><div className="eyebrow">All accounts</div><div className="v tnum">{everyone.length}</div><div className="d">signed up on the site</div></div>
          <div className="card kpi"><div className="eyebrow">Learners</div><div className="v tnum">{count("learner")}</div><div className="d">{everyone.filter((u) => u.role === "learner" && !u.enrolments).length} not enrolled yet</div></div>
          <div className="card kpi"><div className="eyebrow">Facilitators</div><div className="v tnum">{count("facilitator")}</div><div className="d">teach assigned courses</div></div>
          <div className="card kpi"><div className="eyebrow">Admins</div><div className="v tnum">{count("admin")}</div><div className="d">full control</div></div>
        </div>
        <form className="panel row" style={{ gap: 10, alignItems: "end" }} action="/admin">
          <input type="hidden" name="tab" value="users" />
          <div className="field" style={{ flex: "1 1 220px" }}><label htmlFor="u-q">Search</label><input id="u-q" name="q" defaultValue={sp.q ?? ""} placeholder="Name, email or phone" /></div>
          <div className="field" style={{ flex: "0 1 180px" }}>
            <label htmlFor="u-role">Role</label>
            <select id="u-role" name="role" defaultValue={roleFilter}>
              <option value="all">Everyone</option><option value="learner">Learners</option><option value="facilitator">Facilitators</option><option value="admin">Admins</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm">Filter</button>
        </form>
        <div className="panel tscroll" style={{ padding: "6px 10px" }}>
          <table className="tbl">
            <thead><tr><th>Person</th><th>Joined</th><th>Last sign-in</th><th>Courses</th><th>Role</th><th>Teaches</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.full_name ?? "—"}</b><br /><span className="small muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span></td>
                  <td className="small">{new Date(u.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="small">{u.last_sign_in_at ? date(u.last_sign_in_at) : "Never"}</td>
                  <td className="tnum">{u.role === "learner" ? u.enrolments : "—"}</td>
                  <td>
                    {u.id === user.id ? (
                      <span className="role-chip">Admin (you)</span>
                    ) : (
                      <form action={setUserRole} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <select name="role" defaultValue={u.role} aria-label={`Role for ${u.full_name ?? u.email}`} style={sel}>
                          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-sm">Save</button>
                      </form>
                    )}
                  </td>
                  <td style={{ minWidth: 220 }}>
                    {u.role !== "facilitator" ? <span className="small muted">{u.role === "admin" ? "All courses" : "—"}</span> : (
                      <div className="stack" style={{ gap: 6 }}>
                        {(assigns ?? []).filter((a) => a.user_id === u.id).map((a) => (
                          <form key={a.course_id} action={unassignFacilitator} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                            <input type="hidden" name="course_id" value={a.course_id} />
                            <input type="hidden" name="user_id" value={u.id} />
                            <span className="small">{titleOf.get(a.course_id)}</span>
                            <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} aria-label={`Remove from ${titleOf.get(a.course_id)}`}>✕</button>
                          </form>
                        ))}
                        <form action={assignCourse} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <select name="course_id" defaultValue="" required aria-label="Add a course" style={{ ...sel, maxWidth: 170 }}>
                            <option value="" disabled>Add a course…</option>
                            {(courseList ?? []).filter((c) => !(assigns ?? []).some((a) => a.user_id === u.id && a.course_id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                          <button className="btn btn-ghost btn-sm">Add</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="muted">No accounts match.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="small muted">Anyone who signs up starts as a learner. Make someone a facilitator, then add the courses they teach. Every change goes into the audit log.</p>
      </div>
    );
  } else if (tab === "leads") {
    const { data: leads } = await supabase.from("leads").select("*, courses(title)").order("created_at", { ascending: false }).limit(200);
    body = (
      <div className="panel tscroll" style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>Ref</th><th>Received</th><th>Type</th><th>Who</th><th>Course</th><th>Source</th><th>Routed to</th><th>Status</th></tr></thead>
          <tbody>
            {(leads ?? []).map((l) => (
              <tr key={l.id}>
                <td className="mono">{l.ref}</td>
                <td className="small">{date(l.created_at)}</td>
                <td>{LEAD_LABEL[l.type] ?? l.type}</td>
                <td><b>{l.name}</b>{l.company ? <><br /><span className="small muted">{l.company}{l.staff_count ? ` · ${l.staff_count} people` : ""}</span></> : null}<br /><span className="small muted">{l.email ?? ""} {l.phone ?? ""}</span></td>
                <td>{(l.courses as { title: string } | null)?.title ?? "—"}</td>
                <td>{l.source}</td>
                <td>{l.routed_to}</td>
                <td>
                  <form action={updateLeadStatus} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <input type="hidden" name="id" value={l.id} />
                    <select name="status" defaultValue={l.status} aria-label={`Status for ${l.ref}`} style={{ padding: "5px 6px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)" }}>
                      {["new", "contacted", "quoted", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm">Save</button>
                  </form>
                </td>
              </tr>
            ))}
            {!leads?.length && <tr><td colSpan={8} className="muted">No enquiries yet. Submit one from the employer or venue page.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  } else if (tab === "orders") {
    const { data: orders } = await supabase.from("orders").select("*, courses(title)").order("created_at", { ascending: false }).limit(200);
    body = (
      <div className="panel tscroll" style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>Invoice</th><th>Date</th><th>Course</th><th>Amount</th><th>Payment ref</th><th>Status</th></tr></thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.invoice_no}</td>
                <td className="small">{date(o.created_at)}</td>
                <td>{(o.courses as { title: string } | null)?.title}</td>
                <td className="tnum">{rand(o.amount_cents)}</td>
                <td className="mono small">{o.gateway_payment_id ?? "—"}</td>
                <td><span className={`badge ${STATUS_BADGE[o.status] ?? "b-short"}`}>{o.status}</span></td>
              </tr>
            ))}
            {!orders?.length && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  } else if (tab === "courses") {
    const { data: courses } = await supabase.from("courses").select("*").order("title");
    body = (
      <>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <p className="muted small">Click a course to edit everything on its page: content, intakes, accreditation and certificates.</p>
          <Link className="btn btn-primary btn-sm" href="/admin/courses/new">Add a course</Link>
        </div>
        <div className="panel tscroll" style={{ padding: "6px 10px" }}>
          <table className="tbl">
            <thead><tr><th>Course</th><th>Type</th><th>Quick price change (R, incl. VAT)</th><th>Visibility</th></tr></thead>
            <tbody>
              {((courses ?? []) as Course[]).map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/courses/${c.id}`}><b>{c.title}</b></Link><br /><span className="mono muted">{c.code}</span> · <Link className="small" href={`/admin/courses/${c.id}`}>Edit</Link></td>
                  <td><KindBadge course={c} /></td>
                  <td>
                    {c.price_basis === "fixed" ? (
                      <form action={updatePrice} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <input name="price" type="number" min={1} step={50} defaultValue={(c.price_cents ?? 0) / 100} aria-label={`Price for ${c.title}`} style={{ maxWidth: 110, padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)" }} />
                        <button className="btn btn-primary btn-sm">Publish</button>
                      </form>
                    ) : <span className="muted">By application</span>}
                  </td>
                  <td>
                    <form action={togglePublished}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="published" value={String(c.published)} />
                      <button className="btn btn-ghost btn-sm">{c.published ? "Live · hide" : "Hidden · show"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Every change is written to the audit log with the staff member's account.</p>
      </>
    );
  } else {
    const { data: rows } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
    body = (
      <div className="panel tscroll" style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => <tr key={r.id}><td className="small">{date(r.created_at)}</td><td>{r.action}</td><td className="mono small">{JSON.stringify(r.detail)}</td></tr>)}
            {!rows?.length && <tr><td colSpan={3} className="muted">No changes recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <div className="sec-head">
          <div><div className="eyebrow">Admin back office</div><h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Academy dashboard</h1></div>
          <span className="small muted">Signed in as {profile.full_name ?? user.email} · Admin</span>
        </div>
        <nav className="tabs" aria-label="Admin sections">
          {TABS.map(([key, label]) => (
            <Link key={key} href={`/admin?tab=${key}`} aria-current={tab === key ? "page" : undefined} style={{ padding: "10px 14px", fontWeight: 600, textDecoration: "none", color: tab === key ? "var(--accent)" : "var(--muted)", borderBottom: `2.5px solid ${tab === key ? "var(--accent)" : "transparent"}`, whiteSpace: "nowrap" }}>
              {label}
            </Link>
          ))}
        </nav>
        {body}
      </div>
    </section>
  );
}
