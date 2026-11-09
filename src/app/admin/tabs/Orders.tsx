import Link from "next/link";
import { rand } from "@/lib/format";
import { followUpOrder, refundOrder } from "../actions";
import { type DB, waLink, when } from "./shared";

const BADGE: Record<string, string> = { paid: "b-good", pending: "b-warn", failed: "b-bad", cancelled: "b-short", refunded: "b-short" };

/** Payments, receipts, refunds and follow-up of unpaid checkouts (failed-payment recovery). */
export default async function OrdersTab({ supabase, sp }: { supabase: DB; sp: Record<string, string | undefined> }) {
  const [{ data: orders }, { data: profs }] = await Promise.all([
    supabase.from("orders").select("*, courses(title, slug)").order("created_at", { ascending: false }).limit(300),
    supabase.from("profiles").select("id, full_name, phone"),
  ]);
  const who = new Map((profs ?? []).map((p) => [p.id, p]));
  const all = orders ?? [];
  const unpaid = all.filter((o) => o.status === "pending" || o.status === "failed");
  const view = sp.view ?? (unpaid.length ? "recover" : "all");
  const list = view === "recover" ? unpaid : view === "paid" ? all.filter((o) => o.status === "paid") : view === "refunded" ? all.filter((o) => o.status === "refunded") : all;
  const paid = all.filter((o) => o.status === "paid");
  const VIEWS: [string, string, number][] = [["recover", "Unpaid: follow up", unpaid.length], ["paid", "Paid", paid.length], ["refunded", "Refunded", all.filter((o) => o.status === "refunded").length], ["all", "All", all.length]];

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="kpis">
        <div className="card kpi"><div className="eyebrow">Paid</div><div className="v tnum">{rand(paid.reduce((a, o) => a + o.amount_cents, 0))}</div><div className="d">{paid.length} orders</div></div>
        <div className="card kpi"><div className="eyebrow">Unpaid checkouts</div><div className="v tnum">{unpaid.length}</div><div className="d">{unpaid.filter((o) => !o.followed_up_at).length} not yet followed up</div></div>
        <div className="card kpi"><div className="eyebrow">Discounts given</div><div className="v tnum">{rand(paid.reduce((a, o) => a + (o.discount_cents ?? 0), 0))}</div><div className="d">via approved coupons</div></div>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 6 }}>
          {VIEWS.map(([k, label, n]) => <a key={k} href={`/admin?tab=orders&view=${k}`} className={`btn btn-sm ${view === k ? "btn-primary" : "btn-ghost"}`}>{label} <span className="tnum">({n})</span></a>)}
        </div>
        <a className="btn btn-ghost btn-sm" href="/admin/export/orders">Download CSV</a>
      </div>
      <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>Invoice</th><th>Learner</th><th>Course</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {list.map((o) => {
              const p = who.get(o.user_id);
              const course = o.courses as { title: string; slug: string } | null;
              const wa = waLink(p?.phone, `Hi ${p?.full_name?.split(" ")[0] ?? ""}, this is Training Africa Academy. Your payment for ${course?.title} didn't go through. You can finish enrolling here: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkout/${course?.slug}. Can we help?`);
              return (
                <tr key={o.id}>
                  <td><Link className="mono" href={`/orders/${o.id}`}>{o.invoice_no}</Link><br /><span className="small muted">{when(o.created_at)}</span></td>
                  <td><b>{p?.full_name ?? "Learner"}</b><br /><span className="small muted">{p?.phone ?? ""}</span></td>
                  <td>{course?.title}</td>
                  <td className="tnum">{rand(o.amount_cents)}{o.instalments > 1 ? <><br /><span className="small muted">instalment {o.instalment_no}/{o.instalments} of {rand(o.plan_total_cents)}</span></> : null}{o.coupon_code ? <><br /><span className="small muted">{o.coupon_code} −{rand(o.discount_cents)}</span></> : null}</td>
                  <td>
                    <span className={`badge ${BADGE[o.status] ?? "b-short"}`}>{o.status}</span>
                    {o.gateway_payment_id && <div className="mono small muted">{o.gateway_payment_id}</div>}
                    {o.staff_note && <div className="small muted">{o.staff_note}</div>}
                  </td>
                  <td style={{ minWidth: 240 }}>
                    {o.status === "paid" && (
                      <details>
                        <summary className="small" style={{ cursor: "pointer" }}>Record a refund</summary>
                        <form action={refundOrder} className="stack" style={{ gap: 6, marginTop: 6 }}>
                          <input type="hidden" name="id" value={o.id} />
                          <input name="note" placeholder="Reason / PayFast refund ref" required style={{ padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
                          <label className="small"><input type="checkbox" name="revoke" defaultChecked /> Remove course access</label>
                          <button className="btn btn-ghost btn-sm">Mark refunded</button>
                          <span className="small muted">Refund the money in the PayFast dashboard first.</span>
                        </form>
                      </details>
                    )}
                    {(o.status === "pending" || o.status === "failed") && (
                      <div className="row" style={{ gap: 6 }}>
                        {wa && <a className="btn btn-primary btn-sm" href={wa} target="_blank" rel="noopener">WhatsApp</a>}
                        <form action={followUpOrder}><input type="hidden" name="id" value={o.id} /><button className="btn btn-ghost btn-sm">{o.followed_up_at ? "Followed up ✓" : "Mark followed up"}</button></form>
                        <form action={followUpOrder}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="cancel" value="1" /><button className="btn btn-ghost btn-sm">Cancel</button></form>
                      </div>
                    )}
                    {o.status === "refunded" && <span className="small muted">Refunded {o.refunded_at ? when(o.refunded_at) : ""}</span>}
                  </td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={6} className="muted">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
