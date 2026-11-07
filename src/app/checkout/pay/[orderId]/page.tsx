import { notFound, redirect } from "next/navigation";
import AutoSubmit from "./AutoSubmit";
import { buildCheckoutFields, payfastHost } from "@/lib/payfast";
import { rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Redirecting to payment" };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, amount_cents, courses(title, code)")
    .eq("id", orderId)
    .single();
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/return?order=${order.id}`);

  const course = order.courses as unknown as { title: string; code: string };
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
