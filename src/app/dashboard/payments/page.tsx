import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { PortalHead, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";
import { payNextInstalment } from "@/app/checkout/actions";
import { rand } from "@/lib/format";

export const metadata = { title: "Payments and receipts" };
export const dynamic = "force-dynamic";

export default async function Payments() {
  const s = await loadStudent("/dashboard/payments");
  const paid = s.orders.filter((o) => o.status === "paid").reduce((a, o) => a + o.amount_cents, 0);
  return (
    <PortalShell s={s}>
      <PortalHead eyebrow="Student portal" title="Payments and receipts" />

      {s.duePlans.length > 0 && (
        <div className="panel stack" style={{ borderColor: "var(--warn)" }}>
          <h2 className="h3">Instalments due</h2>
          {s.duePlans.map((p) => (
            <div className="todo" key={p.id}>
              <span style={{ minWidth: 0 }}>
                <b>{p.title}: instalment {p.count + 1} of {p.of}</b><br />
                <span className="small muted">{rand(p.total - p.paid)} left to pay{p.due ? ` · next due ${day(p.due)}` : ""}</span>
              </span>
              <form action={payNextInstalment}>
                <input type="hidden" name="plan" value={p.id} />
                <button className="btn btn-primary btn-sm">Pay {rand(p.nextAmount)}</button>
              </form>
            </div>
          ))}
          <p className="small muted" style={{ margin: 0 }}>Payments are made securely through PayFast. The Academy never sees or stores your card details.</p>
        </div>
      )}

      <div className="panel stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="h3">Payment history</h2>
          {paid > 0 && <span className="small muted">Total paid: <b className="tnum">{rand(paid)}</b></span>}
        </div>
        {s.orders.length === 0 ? (
          <p className="muted small">No payments yet. If your employer paid for your course, their invoice goes to them.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Course</th><th>Date</th><th>Amount</th><th>Status</th><th><span className="sr-only">Receipt</span></th></tr></thead>
              <tbody>
                {s.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono small">{o.invoice_no}</td>
                    <td>{(o.courses as unknown as { title: string }).title}{o.instalments > 1 && <div className="small muted">Instalment {o.instalment_no} of {o.instalments}</div>}</td>
                    <td className="small">{day(o.paid_at ?? o.created_at)}</td>
                    <td className="tnum">{rand(o.amount_cents)}</td>
                    <td><span className={`badge ${o.status === "paid" ? "b-good" : o.status === "refunded" ? "b-short" : "b-warn"}`}>{o.status === "paid" ? "Paid" : o.status === "pending" ? "Not completed" : o.status}</span></td>
                    <td>{o.status === "paid" ? <Link className="small" href={`/orders/${o.id}`}>Receipt</Link> : o.status === "pending" ? <Link className="small" href={`/orders/${o.id}`}>Finish payment</Link> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
