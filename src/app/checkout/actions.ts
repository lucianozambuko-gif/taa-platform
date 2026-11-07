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
 * Demo safety net for sandbox testing on localhost, where PayFast cannot reach the notify URL.
 * Disabled unless ALLOW_SANDBOX_SIMULATION=true and PAYFAST_MODE is not "live".
 */
export async function simulatePayment(formData: FormData) {
  const orderId = String(formData.get("order") ?? "");
  if (process.env.ALLOW_SANDBOX_SIMULATION !== "true" || process.env.PAYFAST_MODE === "live") redirect(`/checkout/return?order=${orderId}`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: order } = await supabase.from("orders").select("id, user_id").eq("id", orderId).single();
  if (user && order && order.user_id === user.id) await fulfilOrder(order.id, "SIMULATED", "COMPLETE (sandbox simulation)");
  redirect(`/checkout/return?order=${orderId}`);
}
