"use server";

import { revalidatePath } from "next/cache";
import { getUserAndProfile } from "@/lib/supabase/server";

export type AssessState = { error?: string; message?: string };

/** Records a facilitator's assessment result. The database function checks the facilitator teaches the course. */
export async function recordAssessment(_: AssessState, fd: FormData): Promise<AssessState> {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["facilitator", "admin"].includes(profile?.role ?? "")) return { error: "Facilitator access only." };
  const enrolment = String(fd.get("enrolment") ?? "");
  const raw = String(fd.get("result") ?? "");
  const outcome = raw === "competent" || raw === "not_yet_competent" ? raw : null;
  const note = String(fd.get("note") ?? "");
  const { error } = await supabase.rpc("record_assessment", { enrolment, outcome, note });
  if (error) return { error: "Couldn't save the result. Please try again." };
  revalidatePath("/facilitator");
  return { message: outcome ? "Result saved. The learner sees it on their dashboard." : "Result cleared." };
}
