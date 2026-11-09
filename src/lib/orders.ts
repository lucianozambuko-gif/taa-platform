import { createAdminClient } from "@/lib/supabase/server";
import { rand } from "@/lib/format";
import { notify } from "@/lib/notify";

// Server-only module (not a server action): never import this from a client component.
/** Marks an order paid and enrols the learner. Called only after PayFast confirms payment (or by the sandbox simulation). */
export async function fulfilOrder(orderId: string, gatewayPaymentId: string | null, gatewayStatus: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, user_id, course_id, status, coupon_code, amount_cents, invoice_no, instalments, instalment_no, plan_total_cents, courses(title, slug, has_lms)").eq("id", orderId).single();
  if (!order) return { ok: false as const, reason: "order not found" };
  if (order.status === "paid") return { ok: true as const };
  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), gateway_payment_id: gatewayPaymentId, gateway_status: gatewayStatus })
    .eq("id", order.id);
  if (updateError) return { ok: false as const, reason: updateError.message };
  if (order.coupon_code && order.instalment_no === 1) await admin.rpc("coupon_used", { c: order.coupon_code });
  await admin
    .from("enrolments")
    .upsert({ user_id: order.user_id, course_id: order.course_id, order_id: order.id, source: "checkout" }, { onConflict: "user_id,course_id" });
  const course = order.courses as unknown as { title: string; slug: string; has_lms: boolean } | null;
  await notify({
    userId: order.user_id, audience: "learner", kind: "payment",
    subject: order.instalments > 1 ? `Instalment ${order.instalment_no} of ${order.instalments} received: ${course?.title}` : `Payment received: ${course?.title}`,
    body: `Thank you. We received ${rand(order.amount_cents)} for ${course?.title} (invoice ${order.invoice_no}).${order.instalments > 1 && order.instalment_no < order.instalments ? ` ${order.instalments - order.instalment_no} instalment(s) left; we'll remind you when the next one is due.` : ""} ${course?.has_lms ? "Your course is open in your dashboard now." : "We'll be in touch with your start date and venue details."}`,
    link: course?.has_lms ? `/learn/${course.slug}` : `/orders/${order.id}`,
  });
  await notify({ audience: "staff", kind: "order_paid", subject: `New paid order ${order.invoice_no}`, body: `${course?.title} · ${rand(order.amount_cents)}${order.coupon_code ? ` · coupon ${order.coupon_code}` : ""}`, link: "/admin?tab=orders&view=paid" });
  return { ok: true as const };
}

