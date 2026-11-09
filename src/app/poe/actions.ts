"use server";

import { revalidatePath } from "next/cache";
import { getUserAndProfile } from "@/lib/supabase/server";

export type PoeState = { error?: string; message?: string };
const SECTIONS = ["Knowledge", "Practical", "Workplace", "Other"] as const;

/** Records a file already uploaded to private storage. Learners add their own evidence; assessors add theirs. */
export async function addPoeEvidence(enrolmentId: string, path: string, name: string, section: string) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return { error: "Please sign in again." };
  const sec = (SECTIONS as readonly string[]).includes(section) ? section : "Other";
  const { data: e } = await supabase.from("enrolments").select("user_id").eq("id", enrolmentId).maybeSingle();
  if (!e) return { error: "Not allowed." };
  const isLearner = e.user_id === user.id;
  if (!isLearner && !["facilitator", "admin"].includes(profile?.role ?? "")) return { error: "Not allowed." };
  const { error } = await supabase.from("assessment_evidence").insert({
    enrolment_id: enrolmentId, path, name: name.slice(0, 120), section: sec, source: isLearner ? "learner" : "assessor", uploaded_by: user.id,
  });
  if (error) return { error: isLearner ? "Couldn't add the file. Portfolios can't be changed after they are submitted." : "Couldn't record the file." };
  await supabase.from("audit_log").insert({ actor: user.id, action: "evidence_upload", entity: "enrolment", entity_id: enrolmentId, detail: { title: name, section: sec } });
  revalidatePath(`/poe/${enrolmentId}`);
  return { ok: true };
}

export async function removePoeEvidence(fd: FormData) {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return;
  const id = String(fd.get("id") ?? "");
  const enrolment = String(fd.get("enrolment") ?? "");
  const { data } = await supabase.from("assessment_evidence").delete().eq("id", id).select("path");
  if (data?.[0]?.path) await supabase.storage.from("evidence").remove([data[0].path]);
  revalidatePath(`/poe/${enrolment}`);
}

export async function submitPoe(_: PoeState, fd: FormData): Promise<PoeState> {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return { error: "Please sign in again." };
  if (fd.get("declare") !== "on") return { error: "Please tick the declaration first." };
  const enrolment = String(fd.get("enrolment") ?? "");
  const { error } = await supabase.rpc("submit_poe", { enrolment });
  if (error) return { error: "Couldn't submit. Please try again." };
  revalidatePath(`/poe/${enrolment}`);
  revalidatePath("/dashboard");
  return { message: "Submitted. Your facilitator has been told your portfolio is ready to assess." };
}

export async function moderate(_: PoeState, fd: FormData): Promise<PoeState> {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["moderator", "admin"].includes(profile?.role ?? "")) return { error: "Moderators only." };
  const enrolment = String(fd.get("enrolment") ?? "");
  const outcome = String(fd.get("outcome") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (outcome === "referred" && !note) return { error: "Say what the assessor needs to fix before referring it back." };
  const { error } = await supabase.rpc("moderate_result", { enrolment, outcome, note });
  if (error) return { error: "Couldn't save the moderation decision." };
  revalidatePath(`/poe/${enrolment}`);
  revalidatePath("/moderator");
  return { message: outcome === "endorsed" ? "Endorsed. The learner's statement of results is now available." : "Referred back. The facilitator has been notified." };
}
