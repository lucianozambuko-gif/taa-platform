import Link from "next/link";
import { redirect } from "next/navigation";
import { rand } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { simulatePayment } from "../actions";

export const metadata = { title: "Payment status" };
export const dynamic = "force-dynamic";

export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ order?: string; cancelled?: string }> }) {
  const { order: orderId, cancelled } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/return?order=${orderId ?? ""}`);
  const { data: order } = await supabase
    .from("orders")
    .select("id, invoice_no, status, amount_cents, gateway_payment_id, courses(title, slug, has_lms)")
    .eq("id", orderId ?? "")
    .maybeSingle();

  if (!order)
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack"><h1 style={{ fontSize: "1.6rem" }}>We couldn't find that order</h1><p className="muted">Check your dashboard, or WhatsApp us with your payment reference.</p><div><Link className="btn btn-primary" href="/dashboard">Go to my dashboard</Link></div></div></div></section>
    );

  const course = order.courses as unknown as { title: string; slug: string; has_lms: boolean };
  const simulationAllowed = process.env.ALLOW_SANDBOX_SIMULATION === "true" && process.env.PAYFAST_MODE !== "live";

  if (order.status === "paid")
    return (
      <section className="block" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 660 }}>
          <div className="steps"><span className="done">1. Confirm</span><span className="done">2. Secure payment</span><span className="on">3. Start learning</span></div>
          <div className="panel stack" style={{ gap: 16 }}>
            <span className="badge b-good" style={{ alignSelf: "flex-start" }}>Payment received</span>
            <h1 style={{ fontSize: "1.8rem" }}>You're enrolled</h1>
            <p className="muted">{course.title} is now in your dashboard.</p>
            <div className="card" style={{ padding: 16 }}>
              <div className="sumrow"><span className="muted">Invoice</span><span className="mono">{order.invoice_no}</span></div>
              <div className="sumrow"><span className="muted">Payment reference</span><span className="mono">{order.gateway_payment_id ?? "—"}</span></div>
              <div className="sumrow total tnum"><span>Paid</span><span>{rand(order.amount_cents)}</span></div>
            </div>
            <div className="row">
              {course.has_lms && <Link className="btn btn-primary" href={`/learn/${course.slug}`}>Start the first lesson</Link>}
              <Link className="btn btn-ghost" href="/dashboard">My dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    );

  if (cancelled)
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack" style={{ gap: 14 }}>
        <span className="badge b-bad" style={{ alignSelf: "flex-start" }}>Payment not completed</span>
        <h1 style={{ fontSize: "1.6rem" }}>Your payment was cancelled</h1>
        <p className="muted">You have not been charged. You can try again with card or Instant EFT.</p>
        <div className="row"><Link className="btn btn-primary" href={`/checkout/pay/${order.id}`}>Try again</Link><Link className="btn btn-ghost" href={`/courses/${course.slug}`}>Back to course</Link></div>
      </div></div></section>
    );

  return (
    <section className="block">
      <meta httpEquiv="refresh" content="4" />
      <div className="wrap" style={{ maxWidth: 620 }}>
        <div className="panel stack" style={{ gap: 14 }}>
          <span className="badge b-warn" style={{ alignSelf: "flex-start" }}>Confirming payment</span>
          <h1 style={{ fontSize: "1.6rem" }}>Waiting for PayFast to confirm your payment</h1>
          <p className="muted">This usually takes a few seconds. The page refreshes by itself.</p>
          {simulationAllowed && (
            <form action={simulatePayment} className="notice" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="order" value={order.id} />
              <span>
                {process.env.PAYFAST_MERCHANT_ID
                  ? "Sandbox testing? If PayFast can't reach this site, confirm the payment here."
                  : "Demo mode: PayFast sandbox details aren't set up yet, so confirm the payment here."}
              </span>
              <button className="btn btn-ghost btn-sm">Simulate payment confirmation</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
