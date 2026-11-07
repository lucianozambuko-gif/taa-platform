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

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export type CourseFormState = { error?: string; saved?: boolean };

/** Creates or updates a course. Accreditation details only show publicly once "approved" is ticked. */
export async function saveCourse(_: CourseFormState, fd: FormData): Promise<CourseFormState> {
  const { supabase, user } = await requireAdmin();
  const id = text(fd.get("id"));
  const title = text(fd.get("title"));
  const code = text(fd.get("code"));
  if (!title || !code) return { error: "Title and course code are required." };
  const slug =
    text(fd.get("slug")) ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const basis = String(fd.get("price_basis") ?? "fixed");
  const rands = Number(fd.get("price"));
  if (basis === "fixed" && !(rands > 0)) return { error: "Enter a price, or choose quote-only or learnership pricing." };

  const record = {
    slug,
    code,
    title,
    subject: text(fd.get("subject")) ?? "General",
    kind: String(fd.get("kind") ?? "short"),
    format: String(fd.get("format") ?? "Online"),
    format_note: text(fd.get("format_note")),
    location: text(fd.get("location")) ?? "Online",
    price_basis: basis,
    price_cents: basis === "fixed" ? Math.round(rands * 100) : null,
    duration: text(fd.get("duration")),
    summary: text(fd.get("summary")),
    outcomes: lines(fd.get("outcomes")),
    entry_requirements: text(fd.get("entry_requirements")),
    assessment: text(fd.get("assessment")),
    practical: text(fd.get("practical")),
    certificate: text(fd.get("certificate")),
    audience: text(fd.get("audience")),
    intakes: lines(fd.get("intakes")),
    learner_types: fd.getAll("learner_types").map(String),
    accreditation_body: text(fd.get("accreditation_body")),
    saqa_id: text(fd.get("saqa_id")),
    nqf_level: text(fd.get("nqf_level")),
    credits: text(fd.get("credits")),
    approved_scope: text(fd.get("approved_scope")),
    accreditation_approved: fd.get("accreditation_approved") === "on",
    brochure_url: text(fd.get("brochure_url")),
    has_lms: fd.get("has_lms") === "on",
    certificate_auto: fd.get("certificate_auto") === "on",
    featured: fd.get("featured") === "on",
    published: fd.get("published") === "on",
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("courses").update(record).eq("id", id).select("id").single()
    : await supabase.from("courses").insert(record).select("id").single();
  if (result.error) {
    return { error: result.error.code === "23505" ? "Another course already uses that code or web address." : result.error.message };
  }
  await supabase.from("audit_log").insert({
    actor: user.id,
    action: id ? "course_update" : "course_create",
    entity: "course",
    entity_id: result.data.id,
    detail: { code, title, accreditation_approved: record.accreditation_approved, published: record.published },
  });
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/courses/${result.data.id}?created=1`);
  return { saved: true };
}

export type EnrolState = { error?: string; message?: string };

/** Admin enrolment: gives an existing learner account access to a course (e.g. paid by EFT or employer PO). */
export async function adminEnrol(_: EnrolState, fd: FormData): Promise<EnrolState> {
  const { supabase, user } = await requireAdmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const courseId = String(fd.get("course_id") ?? "");
  if (!email || !courseId) return { error: "Enter the learner's email and choose a course." };
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();
  let found: { id: string } | undefined;
  for (let page = 1; page <= 10 && !found; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    found = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (!data || data.users.length < 200) break;
  }
  if (!found) return { error: `No learner account uses ${email}. Ask them to sign up first, then enrol them here.` };
  const { error } = await supabase.from("enrolments").insert({ user_id: found.id, course_id: courseId, source: "admin" });
  if (error) return { error: error.code === "23505" ? "That learner is already enrolled in this course." : error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "admin_enrol", entity: "enrolment", entity_id: courseId, detail: { email } });
  revalidatePath("/admin");
  return { message: `Enrolled ${email}. The course is now in their dashboard.` };
}
