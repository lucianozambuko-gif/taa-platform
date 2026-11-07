import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { rand, vatIncluded } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect(`/login?next=/orders/${id}`);
  const { data: order } = await supabase
    .from("orders")
    .select("id, invoice_no, status, amount_cents, gateway_payment_id, paid_at, created_at, courses(title, code)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const course = order.courses as unknown as { title: string; code: string };
  const paid = order.status === "paid";

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 16, maxWidth: 760 }}>
        <div className="row no-print" style={{ justifyContent: "space-between" }}>
          <Link href="/dashboard">← My learning</Link>
          <PrintButton label="Download PDF / print" />
        </div>
        <div className="panel stack receipt" style={{ gap: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="cert-brand"><span className="mark">TA</span><span>Training Africa Academy</span></div>
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "1.5rem" }}>{paid ? "Tax invoice / receipt" : "Invoice"}</h1>
              <p className="mono small">{order.invoice_no}</p>
            </div>
          </div>
          <div className="grid g2">
            <div className="small"><div className="eyebrow">Billed to</div><b>{profile?.full_name ?? ""}</b><br />{user.email}<br />{profile?.phone ?? ""}</div>
            <div className="small"><div className="eyebrow">From</div><b>Training Africa Academy</b><br /><span className="tbc">[Address and VAT number to be supplied]</span></div>
          </div>
          <div className="tscroll">
            <table className="tbl">
              <thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
              <tbody>
                <tr><td>{course.title} <span className="mono muted small">({course.code})</span></td><td className="tnum" style={{ textAlign: "right" }}>{rand(order.amount_cents)}</td></tr>
                <tr><td className="muted">VAT included (15%)</td><td className="tnum muted" style={{ textAlign: "right" }}>{rand(vatIncluded(order.amount_cents))}</td></tr>
                <tr><td><b>Total</b></td><td className="tnum" style={{ textAlign: "right" }}><b>{rand(order.amount_cents)}</b></td></tr>
              </tbody>
            </table>
          </div>
          <div className="grid g2 small">
            <div><span className="muted">Invoice date: </span>{fmt(order.created_at)}</div>
            <div><span className="muted">Status: </span><span className={`badge ${paid ? "b-good" : "b-warn"}`}>{paid ? `Paid ${order.paid_at ? fmt(order.paid_at) : ""}` : order.status}</span></div>
            {order.gateway_payment_id && <div><span className="muted">Payment reference: </span><span className="mono">{order.gateway_payment_id}</span></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
