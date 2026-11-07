"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";

async function requireAdmin() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") redirect("/");
  return { supabase, user };
}

export async function updatePrice(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const rands = Number(formData.get("price"));
  if (!Number.isFinite(rands) || rands <= 0) return;
  const cents = Math.round(rands * 100);
  const { data: before } = await supabase.from("courses").select("price_cents, code").eq("id", id).single();
  await supabase.from("courses").update({ price_cents: cents, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "price_change", entity: "course", entity_id: id, detail: { code: before?.code, from: before?.price_cents, to: cents } });
  revalidatePath("/", "layout");
}

export async function togglePublished(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  await supabase.from("courses").update({ published: !published, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: published ? "unpublish" : "publish", entity: "course", entity_id: id });
  revalidatePath("/", "layout");
}

export async function updateLeadStatus(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["new", "contacted", "quoted", "won", "lost"].includes(status)) return;
  await supabase.from("leads").update({ status }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "lead_status", entity: "lead", entity_id: id, detail: { status } });
  revalidatePath("/admin");
}
