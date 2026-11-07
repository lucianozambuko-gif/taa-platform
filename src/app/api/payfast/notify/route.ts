import { NextResponse } from "next/server";
import { fulfilOrder } from "@/lib/orders";
import { confirmItnWithPayfast, verifyItnSignature } from "@/lib/payfast";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * PayFast ITN (Instant Transaction Notification).
 * Checks: signature, PayFast server confirmation, amount matches the order, then enrols the learner.
 * PayFast expects a 200 response; it retries otherwise.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const fields: [string, string][] = Array.from(params.entries());
  const get = (k: string) => params.get(k) ?? "";

  if (!verifyItnSignature(fields)) {
    console.warn("[payfast] ITN rejected: bad signature");
    return new NextResponse("invalid signature", { status: 400 });
  }
  if (!(await confirmItnWithPayfast(raw))) {
    console.warn("[payfast] ITN rejected: PayFast did not confirm");
    return new NextResponse("not confirmed", { status: 400 });
  }

  const orderId = get("m_payment_id");
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, amount_cents, status").eq("id", orderId).single();
  if (!order) return new NextResponse("unknown order", { status: 404 });

  const paidCents = Math.round(Number(get("amount_gross")) * 100);
  if (Math.abs(paidCents - order.amount_cents) > 1) {
    console.warn("[payfast] ITN rejected: amount mismatch", { orderId, paidCents, expected: order.amount_cents });
    await admin.from("orders").update({ status: "failed", gateway_status: "AMOUNT_MISMATCH" }).eq("id", order.id);
    return new NextResponse("amount mismatch", { status: 400 });
  }

  const status = get("payment_status");
  if (status === "COMPLETE") {
    const result = await fulfilOrder(order.id, get("pf_payment_id"), status);
    if (!result.ok) return new NextResponse("could not fulfil", { status: 500 });
  } else if (status === "CANCELLED" || status === "FAILED") {
    await admin.from("orders").update({ status: status === "CANCELLED" ? "cancelled" : "failed", gateway_status: status }).eq("id", order.id);
  }
  return new NextResponse("ok");
}
