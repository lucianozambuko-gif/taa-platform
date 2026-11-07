import Link from "next/link";
import { redirect } from "next/navigation";
import { KindBadge } from "@/components/CourseBits";
import { LEAD_LABEL, rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { togglePublished, updateLeadStatus, updatePrice } from "./actions";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS: [string, string][] = [["overview", "Overview"], ["leads", "Leads"], ["orders", "Orders & enrolments"], ["courses", "Courses & prices"], ["audit", "Audit log"]];
const STATUS_BADGE: Record<string, string> = { paid: "b-good", pending: "b-warn", failed: "b-bad", cancelled: "b-short", new: "b-warn" };
const date = (iso: string) => new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin");
  if (profile?.role !== "admin")
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack">
        <h1 style={{ fontSize: "1.6rem" }}>Admin access only</h1>
        <p className="muted">Your account doesn't have the admin role. An existing administrator can grant it (see the README).</p>
      </div></div></section>
    );
  const tab = (await searchParams).tab ?? "overview";
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
    body = (
      <>
        <div className="kpis">
          <div className="card kpi"><div className="eyebrow">Enquiries</div><div className="v tnum">{leads?.length ?? 0}</div><div className="d">last 30 days</div></div>
          <div className="card kpi"><div className="eyebrow">Course sales</div><div className="v tnum">{rand(paid.reduce((a, o) => a + o.amount_cents, 0))}</div><div className="d">{paid.length} paid orders, 30 days</div></div>
          <div className="card kpi"><div className="eyebrow">Checkout abandonment</div><div className="v tnum">{abandonment}%</div><div className="d">{started - paid.length} of {started} checkouts unpaid</div></div>
          <div className="card kpi"><div className="eyebrow">Enrolled learners</div><div className="v tnum">{learners ?? 0}</div><div className="d">all time</div></div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Enquiries by type, last 30 days</h3>
          {byType.map(([label, n]) => (
            <div className="hbar" key={label}><span>{label}</span><div className="track"><i style={{ width: `${(n / max) * 100}%` }} /></div><span className="tnum">{n}</span></div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Brochure downloads and WhatsApp clicks are tracked in Google Analytics 4.</p>
      </>
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
        <div className="panel tscroll" style={{ padding: "6px 10px" }}>
          <table className="tbl">
            <thead><tr><th>Course</th><th>Type</th><th>Price (R, incl. VAT)</th><th>Visibility</th></tr></thead>
            <tbody>
              {((courses ?? []) as Course[]).map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/courses/${c.slug}`}><b>{c.title}</b></Link><br /><span className="mono muted">{c.code}</span></td>
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
