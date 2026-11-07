"use server";

import { redirect } from "next/navigation";
import { fulfilOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

/** Creates a pending order for the signed-in learner and sends them to the payment step. */
export async function startCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, price_cents, price_basis")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!course || course.price_basis !== "fixed" || !course.price_cents) redirect(`/courses/${slug}`);

  const { data: existing } = await supabase.from("enrolments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
  if (existing) redirect("/dashboard");

  // Price comes from the database, never from the form.
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: user.id, course_id: course.id, amount_cents: course.price_cents })
    .select("id")
    .single();
  if (error || !order) throw new Error("Could not create the order. Please try again.");
  redirect(`/checkout/pay/${order.id}`);
}

/**
 * Demo payments are allowed when no live gateway is in use: either PayFast details aren't set
 * yet, or ALLOW_SANDBOX_SIMULATION=true. Never in live mode.
 */
export async function demoPaymentsAllowed() {
  if (process.env.PAYFAST_MODE === "live") return false;
  return process.env.ALLOW_SANDBOX_SIMULATION === "true" || !process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY;
}

async function ownOrder(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: order } = await supabase.from("orders").select("id, user_id, status").eq("id", orderId).maybeSingle();
  return user && order && order.user_id === user.id ? order : null;
}

/** Demo: marks the order paid and enrols the learner, as a confirmed payment would. */
export async function simulatePayment(formData: FormData) {
  const orderId = String(formData.get("order") ?? "");
  if (await demoPaymentsAllowed()) {
    const order = await ownOrder(orderId);
    const method = formData.get("method") === "eft" ? "EFT" : "CARD";
    if (order) await fulfilOrder(order.id, `DEMO-${method}-${Date.now().toString(36).toUpperCase()}`, "COMPLETE (demo payment)");
  }
  redirect(`/checkout/return?order=${orderId}`);
}

/** Demo: shows the declined-payment path. The order stays unpaid, so the learner can try again. */
export async function simulateFailedPayment(formData: FormData) {
  const orderId = String(formData.get("order") ?? "");
  redirect(`/checkout/return?order=${orderId}&cancelled=1`);
}
