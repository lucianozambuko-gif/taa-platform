import { notFound, redirect } from "next/navigation";
import AutoSubmit from "./AutoSubmit";
import { buildCheckoutFields, payfastHost } from "@/lib/payfast";
import { rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";
import { simulateFailedPayment, simulatePayment } from "../../actions";

export const metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const { data: order } = await supabase
    .from("orders")
    .select("id, invoice_no, status, amount_cents, discount_cents, coupon_code, courses(title, code)")
    .eq("id", orderId)
    .single();
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/return?order=${order.id}`);
  const course = order.courses as unknown as { title: string; code: string };

  const payfastReady = !!process.env.PAYFAST_MERCHANT_ID && !!process.env.PAYFAST_MERCHANT_KEY;

  // Demo mode: no payment gateway connected yet. Clearly labelled; no card details are collected.
  if (!payfastReady && process.env.PAYFAST_MODE !== "live") {
    return (
      <section className="block">
        <div className="wrap" style={{ maxWidth: 560 }}>
          <div className="steps"><span className="done">1. Confirm</span><span className="on">2. Payment</span><span>3. Start learning</span></div>
          <div className="panel stack" style={{ gap: 16 }}>
            <span className="badge b-warn" style={{ alignSelf: "flex-start" }}>Demo payment · no real money</span>
            <h1 style={{ fontSize: "1.6rem" }}>Pay {rand(order.amount_cents)}</h1>
            <div className="card" style={{ padding: 14 }}>
              <div className="sumrow"><span className="muted">Course</span><span>{course.title}</span></div>
              <div className="sumrow"><span className="muted">Invoice</span><span className="mono">{order.invoice_no}</span></div>
              {order.coupon_code && <div className="sumrow tnum muted small"><span>Coupon {order.coupon_code}</span><span>−{rand(order.discount_cents)}</span></div>}
              <div className="sumrow total tnum"><span>Amount</span><span>{rand(order.amount_cents)}</span></div>
            </div>
            <form action={simulatePayment} className="stack" style={{ gap: 14 }}>
              <input type="hidden" name="order" value={order.id} />
              <div className="paymeth">
                <label><input type="radio" name="method" value="card" defaultChecked /><span><b>Card</b><br /><span className="muted small">Visa, Mastercard</span></span></label>
                <label><input type="radio" name="method" value="eft" /><span><b>Instant EFT</b><br /><span className="muted small">Pay from your bank app</span></span></label>
              </div>
              <button className="btn btn-primary">Pay {rand(order.amount_cents)}</button>
            </form>
            <form action={simulateFailedPayment}>
              <input type="hidden" name="order" value={order.id} />
              <button className="linkbtn small">Show a declined payment instead</button>
            </form>
            <p className="small muted">
              In the live platform this step is PayFast's secure hosted checkout. Card details are entered there and never touch this website.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const [first, ...rest] = (profile?.full_name ?? "Learner").trim().split(/\s+/);
  const fields = buildCheckoutFields({
    orderId: order.id,
    amountCents: order.amount_cents,
    itemName: course.title,
    itemDescription: course.code,
    firstName: first,
    lastName: rest.join(" ") || first,
    email: user.email ?? "",
  });

  return (
    <section className="block">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <div className="steps"><span className="done">1. Confirm</span><span className="on">2. Secure payment</span><span>3. Start learning</span></div>
        <form id="payfast" action={`${payfastHost()}/eng/process`} method="post" className="panel stack" style={{ gap: 14 }}>
          {fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <h1 style={{ fontSize: "1.6rem" }}>Taking you to PayFast…</h1>
          <p className="muted">Paying {rand(order.amount_cents)} for {course.title}. If nothing happens in a few seconds, continue below.</p>
          {process.env.PAYFAST_MODE !== "live" && <span className="badge b-warn" style={{ alignSelf: "flex-start" }}>Sandbox mode: no real money is taken</span>}
          <div><button className="btn btn-primary">Continue to PayFast</button></div>
        </form>
        <AutoSubmit formId="payfast" />
      </div>
    </section>
  );
}
