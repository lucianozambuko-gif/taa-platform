import Link from "next/link";
import { redirect } from "next/navigation";
import { QuickLinks, Tile, TodoList, WorkHead, today, type Todo } from "@/components/WorkBits";
import { LEAD_LABEL, rand } from "@/lib/format";
import { homeFor } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Sales desk" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
const STATUS_BADGE: Record<string, string> = { new: "b-warn", contacted: "b-short", quoted: "b-acc", won: "b-good", lost: "b-bad" };
type Lead = { id: string; ref: string; type: string; name: string; company: string | null; status: string; assigned_to: string | null; created_at: string; updated_at: string | null; source: string | null; staff_count: number | null; courses: { title: string } | null };

/** Where sales and admissions staff land: the pipeline, what needs a reply today, and money waiting at checkout. */
export default async function SalesOverview() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/sales");
  const role = profile?.role ?? "learner";
  if (role !== "sales" && role !== "admin") redirect(homeFor(role));

  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const threeDays = new Date(Date.now() - 3 * 864e5).toISOString();
  const [{ data: leadRows }, { data: orders }, { data: coupons }] = await Promise.all([
    supabase.from("leads").select("id, ref, type, name, company, status, assigned_to, created_at, updated_at, source, staff_count, courses(title)").order("created_at", { ascending: false }).limit(300),
    supabase.from("orders").select("id, status, amount_cents, created_at, followed_up_at").gte("created_at", since),
    supabase.from("coupons").select("id, status, created_by").eq("status", "pending"),
  ]);
  const leads = (leadRows ?? []) as unknown as Lead[];
  const open = leads.filter((l) => !["won", "lost"].includes(l.status));
  const by = (s: string) => leads.filter((l) => l.status === s);
  const recent = (s: string) => by(s).filter((l) => (l.updated_at ?? l.created_at) >= since);
  const mine = open.filter((l) => l.assigned_to === user.id);
  const stale = (l: Lead) => (l.updated_at ?? l.created_at) < threeDays;
  const unassigned = open.filter((l) => !l.assigned_to);
  const venue = open.filter((l) => l.type === "venue" && l.status === "new");
  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const unpaid = (orders ?? []).filter((o) => o.status === "pending" && !o.followed_up_at && o.created_at < dayAgo);
  const quotedOld = by("quoted").filter(stale);

  const todos: Todo[] = [];
  if (by("new").length) todos.push({ key: "new", n: by("new").length, tone: "bad", title: `new ${by("new").length === 1 ? "enquiry needs" : "enquiries need"} a first reply`, detail: by("new").slice(0, 3).map((l) => l.company ?? l.name).join(", "), href: "/admin?tab=leads", cta: "Reply" });
  if (unassigned.length) todos.push({ key: "un", n: unassigned.length, title: `${unassigned.length === 1 ? "enquiry has" : "enquiries have"} no owner yet`, href: "/admin?tab=leads&view=unassigned", cta: "Assign" });
  if (mine.filter(stale).length) todos.push({ key: "stale", n: mine.filter(stale).length, title: "of your leads have had no update for 3+ days", detail: mine.filter(stale).slice(0, 3).map((l) => l.company ?? l.name).join(", "), href: "/admin?tab=leads&view=mine", cta: "Follow up" });
  if (quotedOld.length) todos.push({ key: "quoted", n: quotedOld.length, title: `${quotedOld.length === 1 ? "quote is" : "quotes are"} waiting for the client's answer`, detail: "Quoted 3+ days ago", href: "/admin?tab=leads", cta: "Chase" });
  if (unpaid.length) todos.push({ key: "unpaid", n: unpaid.length, title: `unpaid ${unpaid.length === 1 ? "checkout is" : "checkouts are"} older than a day`, detail: "The system already sent one reminder", href: "/admin?tab=orders", cta: "Follow up" });
  if (venue.length) todos.push({ key: "venue", n: venue.length, title: `venue ${venue.length === 1 ? "request needs" : "requests need"} a reply`, href: "/admin?tab=venue", cta: "Open" });
  if (role === "admin" && (coupons ?? []).length) todos.push({ key: "cp", n: (coupons ?? []).length, title: "coupons are waiting for approval", href: "/admin?tab=coupons", cta: "Approve" });

  const stages: [string, string, number, string, boolean][] = [
    ["new", "New", by("new").length, "/admin?tab=leads", true],
    ["contacted", "Contacted", by("contacted").length, "/admin?tab=leads", false],
    ["quoted", "Quoted", by("quoted").length, "/admin?tab=leads", false],
    ["won", "Won · 30 days", recent("won").length, "/admin?tab=leads&view=closed", false],
    ["lost", "Lost · 30 days", recent("lost").length, "/admin?tab=leads&view=closed", false],
  ];
  const closed = recent("won").length + recent("lost").length;

  return (
    <>
      <WorkHead eyebrow={today()} title={`Good day, ${(profile?.full_name ?? "").split(" ")[0] || "there"}`}>
        <Link className="btn btn-primary btn-sm" href="/admin?tab=leads">Open the lead register</Link>
      </WorkHead>

      <div className="stat-tiles">
        <Tile href="/admin?tab=leads" value={by("new").length} label={by("new").length === 1 ? "new enquiry" : "new enquiries"} warn={by("new").length > 0} />
        <Tile href="/admin?tab=leads&view=mine" value={mine.length} label="open leads assigned to me" />
        <Tile href="/admin?tab=orders" value={rand(paid.reduce((a, o) => a + o.amount_cents, 0))} label={`course sales, 30 days (${paid.length} paid)`} />
        <Tile href="/admin?tab=orders" value={unpaid.length} label="unpaid checkouts to follow up" warn={unpaid.length > 0} />
      </div>

      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="h3">Pipeline</h2>
          <span className="small muted">{closed ? `${Math.round((recent("won").length / closed) * 100)}% of closed leads won in the last 30 days` : "No leads closed in the last 30 days"}</span>
        </div>
        <div className="pipeline">
          {stages.map(([k, label, count, href, hot]) => (
            <Link key={k} href={href} className={hot && count > 0 ? "hot" : undefined}><b className="tnum">{count}</b><span>{label}</span></Link>
          ))}
        </div>
      </div>

      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <TodoList todos={todos} empty="Nothing waiting. Enquiries left for 3+ days are also emailed to their owner each morning." />
          <div className="panel stack" style={{ gap: 4 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h3">Latest enquiries</h2>
              <Link className="small" href="/admin?tab=leads&view=all">All leads →</Link>
            </div>
            {leads.slice(0, 6).map((l) => (
              <Link key={l.id} href={`/admin?tab=leads&view=${["won", "lost"].includes(l.status) ? "closed" : "open"}`} className="todo" style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ minWidth: 0 }}>
                  <b>{l.company ?? l.name}</b> <span className="mono small muted">{l.ref}</span><br />
                  <span className="small muted">{LEAD_LABEL[l.type] ?? l.type}{l.courses?.title ? ` · ${l.courses.title}` : ""}{l.staff_count ? ` · ${l.staff_count} staff` : ""} · {day(l.created_at)}</span>
                </span>
                <span className={`badge ${STATUS_BADGE[l.status] ?? "b-short"}`}>{l.status}</span>
              </Link>
            ))}
            {!leads.length && <p className="small muted">Enquiries from every form on the website land here.</p>}
          </div>
        </div>
        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">Enquiries by type</div>
            {Object.keys(LEAD_LABEL).map((t) => {
              const c = open.filter((l) => l.type === t).length;
              return <div key={t} className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><span className="small">{LEAD_LABEL[t]}</span><span className="badge b-short tnum">{c} open</span></div>;
            })}
          </div>
          <QuickLinks links={[["/admin?tab=learners", "Enrol a learner or a staff list"], ["/admin/report", "Employer progress report"], ["/campaigns", "Campaign links and lead sources"], ["/admin?tab=coupons", "Request a coupon"]]} />
        </aside>
      </div>
    </>
  );
}
