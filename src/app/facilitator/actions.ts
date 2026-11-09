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

// ---------------------------------------------------------------------------
// Attendance register
// ---------------------------------------------------------------------------
export async function createSession(fd: FormData) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["facilitator", "admin"].includes(profile?.role ?? "")) return;
  const courseId = String(fd.get("course_id") ?? "");
  const date = String(fd.get("date") ?? "");
  const title = String(fd.get("title") ?? "").trim() || "Class day";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const { data } = await supabase
    .from("class_sessions")
    .insert({ course_id: courseId, date, title, location: String(fd.get("location") ?? "").trim() || null, created_by: user.id })
    .select("id")
    .single();
  revalidatePath("/facilitator/attendance");
  if (data) {
    const { redirect } = await import("next/navigation");
    redirect(`/facilitator/attendance?course=${String(fd.get("slug") ?? "")}&session=${data.id}`);
  }
}

export async function saveAttendance(fd: FormData) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["facilitator", "admin"].includes(profile?.role ?? "")) return;
  const sessionId = String(fd.get("session_id") ?? "");
  const learners = fd.getAll("learner").map(String);
  const present = new Set(fd.getAll("present").map(String));
  if (!sessionId || !learners.length) return;
  await supabase.from("attendance").upsert(
    learners.map((id) => ({ session_id: sessionId, user_id: id, present: present.has(id), marked_by: user.id, marked_at: new Date().toISOString() })),
    { onConflict: "session_id,user_id" },
  );
  await supabase.from("audit_log").insert({ actor: user.id, action: "attendance", entity: "class_session", entity_id: sessionId, detail: { present: present.size, of: learners.length } });
  revalidatePath("/facilitator/attendance");
}

// ---------------------------------------------------------------------------
// Assessment evidence (files are uploaded from the browser to private storage first)
// ---------------------------------------------------------------------------
export async function addEvidence(enrolmentId: string, path: string, name: string) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["facilitator", "admin"].includes(profile?.role ?? "")) return { error: "Not allowed" };
  const { error } = await supabase.from("assessment_evidence").insert({ enrolment_id: enrolmentId, path, name: name.slice(0, 120), uploaded_by: user.id });
  if (error) return { error: "Couldn't record the file." };
  await supabase.from("audit_log").insert({ actor: user.id, action: "evidence_upload", entity: "enrolment", entity_id: enrolmentId, detail: { title: name } });
  revalidatePath("/facilitator");
  return { ok: true };
}
