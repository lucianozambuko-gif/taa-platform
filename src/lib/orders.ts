import { createAdminClient } from "@/lib/supabase/server";

// Server-only module (not a server action): never import this from a client component.
/** Marks an order paid and enrols the learner. Called only after PayFast confirms payment (or by the sandbox simulation). */
export async function fulfilOrder(orderId: string, gatewayPaymentId: string | null, gatewayStatus: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, user_id, course_id, status").eq("id", orderId).single();
  if (!order) return { ok: false as const, reason: "order not found" };
  if (order.status === "paid") return { ok: true as const };
  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), gateway_payment_id: gatewayPaymentId, gateway_status: gatewayStatus })
    .eq("id", order.id);
  if (updateError) return { ok: false as const, reason: updateError.message };
  await admin
    .from("enrolments")
    .upsert({ user_id: order.user_id, course_id: order.course_id, order_id: order.id, source: "checkout" }, { onConflict: "user_id,course_id" });
  return { ok: true as const };
}

