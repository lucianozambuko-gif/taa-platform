"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";
import { notify } from "@/lib/notify";

/** Allows admins plus the listed staff roles; everyone else is sent home. */
async function requireRole(...roles: Role[]) {
  const { supabase, user, profile } = await getUserAndProfile();
  const role = profile?.role as Role | undefined;
  if (!user || !role || (role !== "admin" && !roles.includes(role))) redirect("/");
  return { supabase, user, role };
}
const requireAdmin = () => requireRole();
const requireContent = () => requireRole("content");
const requireSales = () => requireRole("sales");

export async function updatePrice(formData: FormData) {
  const { supabase, user } = await requireContent();
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
  const { supabase, user } = await requireContent();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  await supabase.from("courses").update({ published: !published, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: published ? "unpublish" : "publish", entity: "course", entity_id: id });
  revalidatePath("/", "layout");
}

export async function updateLeadStatus(formData: FormData) {
  const { supabase, user } = await requireSales();
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
  const { supabase, user } = await requireContent();
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
    instalments: Math.max(1, Math.min(6, Number(fd.get("instalments")) || 1)),
    summary_zu: text(fd.get("summary_zu")),
    summary_st: text(fd.get("summary_st")),
    eligibility: lines(fd.get("eligibility"))
      .map((l) => l.split("|").map((x) => x.trim()))
      .filter(([q]) => q)
      .map(([q, ok, fail]) => ({ q, ok: /^n/i.test(ok ?? "") ? "no" : "yes", fail: fail || "Talk to an advisor before you apply." })),
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
  const { supabase, user } = await requireSales();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const courseId = String(fd.get("course_id") ?? "");
  if (!email || !courseId) return { error: "Enter the learner's email and choose a course." };
  const { data: foundId } = await supabase.rpc("admin_user_by_email", { e: email });
  const found = foundId ? { id: foundId as string } : undefined;
  if (!found) return { error: `No learner account uses ${email}. Ask them to sign up first, then give access here.` };
  const company = String(fd.get("company") ?? "").trim() || null;
  const { error } = await supabase.from("enrolments").insert({ user_id: found.id, course_id: courseId, source: company ? "employer" : "admin", company });
  if (error) return { error: error.code === "23505" ? "That learner is already enrolled in this course." : error.message };
  const { data: c } = await supabase.from("courses").select("title, slug, has_lms").eq("id", courseId).single();
  await notify({ userId: found.id, audience: "learner", kind: "access", subject: `You now have access to ${c?.title}`, body: `Training Africa Academy has enrolled you in ${c?.title}.${c?.has_lms ? " You can start the online lessons now." : " We'll confirm your start date and venue."}`, link: c?.has_lms ? `/learn/${c.slug}` : "/dashboard" });
  await supabase.from("audit_log").insert({ actor: user.id, action: "admin_enrol", entity: "enrolment", entity_id: courseId, detail: { email } });
  revalidatePath("/admin");
  return { message: `Done. ${email} now has the course in their dashboard.` };
}

/** Changes an account's role. Admins can't remove their own admin role. */
export async function setUserRole(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(fd.get("user_id") ?? "");
  const role = String(fd.get("role") ?? "");
  if (!id || !["learner", "employer", "facilitator", "moderator", "sales", "content", "admin"].includes(role) || (id === user.id && role !== "admin")) return;
  const company = String(fd.get("company") ?? "").trim() || null;
  if (role === "employer" && !company) return;
  await supabase.from("profiles").update({ role, company: role === "employer" ? company : null }).eq("id", id);
  if (role !== "facilitator") await supabase.from("course_facilitators").delete().eq("user_id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "role_change", entity: "profile", entity_id: id, detail: { role } });
  revalidatePath("/admin");
}

/** Assigns a facilitator to teach a course. */
export async function assignCourse(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(fd.get("user_id") ?? "");
  const courseId = String(fd.get("course_id") ?? "");
  if (!id || !courseId) return;
  await supabase.from("course_facilitators").upsert({ course_id: courseId, user_id: id }, { onConflict: "course_id,user_id", ignoreDuplicates: true });
  await supabase.from("audit_log").insert({ actor: user.id, action: "facilitator_assign", entity: "course", entity_id: courseId, detail: { user_id: id } });
  revalidatePath("/admin");
}

export async function unassignFacilitator(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const courseId = String(fd.get("course_id") ?? "");
  const uid = String(fd.get("user_id") ?? "");
  await supabase.from("course_facilitators").delete().eq("course_id", courseId).eq("user_id", uid);
  await supabase.from("audit_log").insert({ actor: user.id, action: "facilitator_unassign", entity: "course", entity_id: courseId, detail: { user_id: uid } });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
/** Status, owner and notes for a lead. */
export async function updateLead(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  const owner = String(fd.get("assigned_to") ?? "");
  const notes = String(fd.get("notes") ?? "").trim().slice(0, 2000);
  if (!["new", "contacted", "quoted", "won", "lost"].includes(status)) return;
  await supabase.from("leads").update({ status, assigned_to: owner || null, notes: notes || null, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "lead_update", entity: "lead", entity_id: id, detail: { status, assigned: !!owner } });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
/** Records a refund made in the PayFast dashboard and, if chosen, removes course access. */
export async function refundOrder(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("id") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  const revoke = fd.get("revoke") === "on";
  const { data: order } = await supabase.from("orders").select("id, user_id, course_id, status, invoice_no").eq("id", id).single();
  if (!order || order.status !== "paid") return;
  await supabase.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString(), staff_note: note || null }).eq("id", id);
  if (revoke) await supabase.from("enrolments").delete().eq("order_id", id);
  await notify({ userId: order.user_id, audience: "learner", kind: "refund", subject: `Refund processed: ${order.invoice_no}`, body: `Your refund for invoice ${order.invoice_no} has been processed and will reach your account in 3 to 7 working days.${revoke ? " Access to the course has ended." : ""}`, link: `/orders/${id}` });
  await supabase.from("audit_log").insert({ actor: user.id, action: "refund", entity: "order", entity_id: id, detail: { code: order.invoice_no, revoked: revoke } });
  revalidatePath("/admin");
}

/** Marks an unpaid checkout as followed up (failed-payment recovery) or cancels it. */
export async function followUpOrder(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("id") ?? "");
  const cancel = fd.get("cancel") === "1";
  await supabase
    .from("orders")
    .update(cancel ? { status: "cancelled" } : { followed_up_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "failed"]);
  await supabase.from("audit_log").insert({ actor: user.id, action: cancel ? "order_cancel" : "order_follow_up", entity: "order", entity_id: id });
  revalidatePath("/admin");
}

/** Removes a learner's access to a course (e.g. wrong course given). */
export async function revokeEnrolment(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("id") ?? "");
  await supabase.from("enrolments").delete().eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "access_removed", entity: "enrolment", entity_id: id });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Coupons: sales request, admin approves
// ---------------------------------------------------------------------------
export type CouponState = { error?: string; message?: string };

export async function requestCoupon(_: CouponState, fd: FormData): Promise<CouponState> {
  const { supabase, user, role } = await requireSales();
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const pct = Number(fd.get("percent_off"));
  const reason = String(fd.get("reason") ?? "").trim();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { error: "Use 3 to 30 letters, numbers or dashes for the code." };
  if (!(pct >= 1 && pct <= 90)) return { error: "Discount must be between 1% and 90%." };
  if (!reason) return { error: "Give a reason so the approver knows why." };
  const maxUses = Number(fd.get("max_uses"));
  const status = role === "admin" ? "active" : "pending";
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code,
      percent_off: pct,
      course_id: String(fd.get("course_id") ?? "") || null,
      max_uses: maxUses > 0 ? maxUses : null,
      expires_on: String(fd.get("expires_on") ?? "") || null,
      reason,
      status,
      created_by: user.id,
      approved_by: role === "admin" ? user.id : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "That code already exists." : error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: role === "admin" ? "coupon_create" : "coupon_request", entity: "coupon", entity_id: data.id, detail: { code, pct } });
  revalidatePath("/admin");
  return { message: role === "admin" ? `${code} is live.` : `${code} was sent to an admin for approval.` };
}

export async function setCouponStatus(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!["active", "disabled"].includes(status)) return;
  await supabase.from("coupons").update({ status, approved_by: status === "active" ? user.id : undefined }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: status === "active" ? "coupon_approve" : "coupon_disable", entity: "coupon", entity_id: id });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Venue bookings
// ---------------------------------------------------------------------------
export type VenueState = { error?: string; message?: string };

const overlaps = (a: string, b: string) => a === "full" || b === "full" || a === b;

async function clash(supabase: Awaited<ReturnType<typeof requireSales>>["supabase"], room: string, date: string, slot: string) {
  const { data } = await supabase.from("venue_bookings").select("slot, status, client").eq("room", room).eq("date", date);
  return (data ?? []).find((b) => overlaps(b.slot, slot));
}

/** Confirms, holds or blocks a room. Refuses double bookings. */
export async function saveBooking(_: VenueState, fd: FormData): Promise<VenueState> {
  const { supabase, user } = await requireSales();
  const room = String(fd.get("room") ?? "");
  const date = String(fd.get("date") ?? "");
  const slot = String(fd.get("slot") ?? "full");
  const status = String(fd.get("status") ?? "confirmed");
  const leadId = String(fd.get("lead_id") ?? "") || null;
  if (!room || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Choose a room and a date." };
  if (!["full", "morning", "afternoon"].includes(slot) || !["held", "confirmed", "blocked"].includes(status)) return { error: "Invalid booking." };
  const taken = await clash(supabase, room, date, slot);
  if (taken) return { error: `${room} is already ${taken.status} on ${date}${taken.client ? ` for ${taken.client}` : ""}.` };
  const { data, error } = await supabase
    .from("venue_bookings")
    .insert({ room, date, slot, status, lead_id: leadId, client: String(fd.get("client") ?? "").trim() || null, note: String(fd.get("note") ?? "").trim() || null, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (leadId && status === "confirmed") {
    await supabase.from("leads").update({ status: "won", updated_at: new Date().toISOString() }).eq("id", leadId);
    const { data: lead } = await supabase.from("leads").select("name, email, ref").eq("id", leadId).single();
    if (lead?.email)
      await notify({ toEmail: lead.email, audience: "enquirer", kind: "venue_confirmed", subject: `Booking confirmed: ${room}, ${date}`, body: `Hi ${lead.name.split(" ")[0]}, your booking of ${room} on ${date} (${slot === "full" ? "full day" : slot}) is confirmed. Reference ${lead.ref}. Our centre coordinator will send the invoice and access details.` });
  }
  if (leadId && status === "held") await supabase.from("leads").update({ status: "quoted", updated_at: new Date().toISOString() }).eq("id", leadId);
  await supabase.from("audit_log").insert({ actor: user.id, action: `venue_${status}`, entity: "venue_booking", entity_id: data.id, detail: { title: `${room} · ${date} · ${slot}` } });
  revalidatePath("/admin");
  revalidatePath("/venue");
  return { message: `${room} ${status} for ${date}.` };
}

export async function updateBooking(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("id") ?? "");
  const action = String(fd.get("action") ?? "");
  const { data: b } = await supabase.from("venue_bookings").select("lead_id, room, date").eq("id", id).single();
  if (!b) return;
  if (action === "confirm") {
    await supabase.from("venue_bookings").update({ status: "confirmed" }).eq("id", id);
    if (b.lead_id) await supabase.from("leads").update({ status: "won", updated_at: new Date().toISOString() }).eq("id", b.lead_id);
  } else if (action === "release") {
    await supabase.from("venue_bookings").delete().eq("id", id);
  } else return;
  await supabase.from("audit_log").insert({ actor: user.id, action: `venue_${action}`, entity: "venue_booking", entity_id: id, detail: { title: `${b.room} · ${b.date}` } });
  revalidatePath("/admin");
  revalidatePath("/venue");
}

/** Declines a venue request: marks the lead lost with a note. */
export async function declineVenueRequest(fd: FormData) {
  const { supabase, user } = await requireSales();
  const id = String(fd.get("lead_id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  await supabase.from("leads").update({ status: "lost", notes: reason ? `Declined: ${reason}` : "Declined", updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "venue_decline", entity: "lead", entity_id: id });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Site content and redirects
// ---------------------------------------------------------------------------
export type ContentState = { error?: string; message?: string };

export async function saveSiteContent(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase, user } = await requireContent();
  const stats = [0, 1, 2, 3]
    .map((i) => ({ value: String(fd.get(`stat_value_${i}`) ?? "").trim(), label: String(fd.get(`stat_label_${i}`) ?? "").trim() }))
    .filter((s) => s.value && s.label);
  const testimonials = [0, 1, 2]
    .map((i) => ({ quote: String(fd.get(`t_quote_${i}`) ?? "").trim(), name: String(fd.get(`t_name_${i}`) ?? "").trim(), role: String(fd.get(`t_role_${i}`) ?? "").trim() }))
    .filter((t) => t.quote && t.name);
  const announcement = { text: String(fd.get("ann_text") ?? "").trim().slice(0, 160), link: String(fd.get("ann_link") ?? "").trim(), on: fd.get("ann_on") === "on" };
  if (announcement.link && !/^(\/|https:\/\/)/.test(announcement.link)) return { error: "The announcement link must start with / or https://" };
  const rows = [
    { key: "home_stats", value: stats },
    { key: "home_testimonials", value: testimonials },
    { key: "announcement", value: announcement },
    { key: "sample_figures", value: fd.get("sample_figures") === "on" },
  ].map((r) => ({ ...r, updated_by: user.id, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("site_content").upsert(rows);
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "site_content_update", entity: "site", detail: { announcement: announcement.on } });
  revalidatePath("/", "layout");
  return { message: "Saved. The homepage is updated." };
}

export async function addRedirect(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase, user } = await requireContent();
  let from = String(fd.get("from_path") ?? "").trim();
  const to = String(fd.get("to_path") ?? "").trim();
  try {
    if (/^https?:\/\//.test(from)) from = new URL(from).pathname;
  } catch {}
  from = from.replace(/\/+$/, "") || "/";
  if (!from.startsWith("/") || from === "/") return { error: "Enter the old page path, e.g. /short-courses" };
  if (!/^(\/|https:\/\/)/.test(to)) return { error: "The new address must start with / or https://" };
  const { error } = await supabase.from("redirects").upsert({ from_path: from, to_path: to });
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "redirect_add", entity: "redirect", detail: { title: `${from} → ${to}` } });
  revalidatePath("/admin");
  return { message: `${from} now goes to ${to}.` };
}

export async function deleteRedirect(fd: FormData) {
  const { supabase, user } = await requireContent();
  const from = String(fd.get("from_path") ?? "");
  await supabase.from("redirects").delete().eq("from_path", from);
  await supabase.from("audit_log").insert({ actor: user.id, action: "redirect_remove", entity: "redirect", detail: { title: from } });
  revalidatePath("/admin");
}

/** FAQs as text: "Q: question" then the answer on the following lines; blank line between items. */
export async function saveFaqs(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase, user } = await requireContent();
  const blocks = String(fd.get("faqs") ?? "").replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const faqs: { q: string; a: string }[] = [];
  for (const [i, b] of blocks.entries()) {
    const [first, ...rest] = b.split("\n");
    if (!/^q[:.]/i.test(first)) return { error: `Item ${i + 1} must start with "Q:".` };
    const a = rest.join(" ").replace(/^a[:.]\s*/i, "").trim();
    if (!a) return { error: `Item ${i + 1} needs an answer under the question.` };
    faqs.push({ q: first.replace(/^q[:.]\s*/i, ""), a });
  }
  const { error } = await supabase.from("site_content").upsert({ key: "faqs", value: faqs, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "faqs_update", entity: "site", detail: { count: faqs.length } });
  revalidatePath("/faqs");
  return { message: `Saved ${faqs.length} questions.` };
}

/** Page titles and search descriptions for the main pages. */
export async function saveSeo(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase, user } = await requireContent();
  const seo: Record<string, { title?: string; description?: string }> = {};
  for (const [k, v] of fd.entries()) {
    const m = k.match(/^(title|description)::(.+)$/);
    const val = String(v).trim();
    if (m && val) (seo[m[2]] ??= {})[m[1] as "title" | "description"] = val.slice(0, m[1] === "title" ? 70 : 300);
  }
  const { error } = await supabase.from("site_content").upsert({ key: "seo", value: seo, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "seo_update", entity: "site", detail: { pages: Object.keys(seo).length } });
  revalidatePath("/", "layout");
  return { message: "Saved. Search engines pick up changes on their next visit." };
}

// ---------------------------------------------------------------------------
// POPIA: requests to delete personal information, and retention clean-up
// ---------------------------------------------------------------------------
export async function anonymiseUser(fd: FormData) {
  const { supabase } = await requireAdmin();
  if (fd.get("confirm") !== "on") return;
  await supabase.rpc("anonymise_user", { target: String(fd.get("user_id") ?? "") });
  revalidatePath("/admin");
}

export async function anonymiseLead(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("anonymise_lead", { target: String(fd.get("id") ?? "") });
  revalidatePath("/admin");
}

export async function purgeOldLeads(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase } = await requireAdmin();
  const months = Number(fd.get("months"));
  const { data, error } = await supabase.rpc("purge_old_leads", { months });
  if (error) return { error: error.message.includes("minimum") ? "Choose at least 6 months." : error.message };
  revalidatePath("/admin");
  return { message: `Removed personal details from ${data ?? 0} closed enquiries older than ${months} months.` };
}

// ---------------------------------------------------------------------------
// Bulk enrolment of employer staff (from a spreadsheet or an employer's list)
// ---------------------------------------------------------------------------
export type BulkState = { error?: string; message?: string; details?: string[] };

export async function bulkEnrol(_: BulkState, fd: FormData): Promise<BulkState> {
  const { supabase, user } = await requireSales();
  const { parseLearners } = await import("@/lib/bulk");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const courseId = String(fd.get("course_id") ?? "");
  const company = String(fd.get("company") ?? "").trim() || null;
  const leadId = String(fd.get("lead_id") ?? "") || null;
  const { rows, errors } = parseLearners(String(fd.get("learners") ?? ""));
  if (!courseId) return { error: "Choose a course." };
  if (!rows.length) return { error: errors[0] ?? "Add at least one learner as: name, email" };
  if (rows.length > 200) return { error: "Upload up to 200 learners at a time." };
  const { data: course } = await supabase.from("courses").select("title, slug, has_lms").eq("id", courseId).single();
  if (!course) return { error: "Course not found." };

  const admin = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let created = 0, enrolled = 0, already = 0;
  const problems: string[] = [...errors];
  for (const r of rows) {
    let { data: id } = await supabase.rpc("admin_user_by_email", { e: r.email });
    let setPassword: string | null = null;
    if (!id) {
      const { data: made, error } = await admin.auth.admin.createUser({ email: r.email, email_confirm: true, user_metadata: { full_name: r.name, phone: r.phone } });
      if (error || !made.user) { problems.push(`${r.email}: ${error?.message ?? "could not create account"}`); continue; }
      id = made.user.id;
      created++;
      await admin.from("profiles").update({ full_name: r.name, phone: r.phone, popia_consent_at: new Date().toISOString() }).eq("id", id);
      const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email: r.email, options: { redirectTo: `${site}/auth/callback?next=/dashboard` } });
      setPassword = link?.properties?.action_link ?? null;
    }
    const { error: enrolError } = await admin.from("enrolments").insert({ user_id: id, course_id: courseId, source: company ? "employer" : "admin", company });
    if (enrolError) { if (enrolError.code === "23505") already++; else problems.push(`${r.email}: ${enrolError.message}`); continue; }
    enrolled++;
    await notify({
      userId: id as string, audience: "learner", kind: "access",
      subject: `You're enrolled in ${course.title}`,
      body: `${company ? `${company} has enrolled you` : "Training Africa Academy has enrolled you"} in ${course.title}.${setPassword ? " Set your password with the link below, then sign in to start." : " Sign in to see it in your dashboard."}`,
      link: setPassword ?? (course.has_lms ? `/learn/${course.slug}` : "/dashboard"),
    });
  }
  if (leadId && enrolled) await supabase.from("leads").update({ status: "won", updated_at: new Date().toISOString(), notes: `Enrolled ${enrolled} learners` }).eq("id", leadId);
  await supabase.from("audit_log").insert({ actor: user.id, action: "bulk_enrol", entity: "course", entity_id: courseId, detail: { title: course.title, company, enrolled, created, already } });
  revalidatePath("/admin");
  return {
    message: `Enrolled ${enrolled} learner${enrolled === 1 ? "" : "s"} in ${course.title}${created ? ` (${created} new account${created === 1 ? "" : "s"} created and sent a set-password link)` : ""}${already ? `; ${already} already enrolled` : ""}.`,
    details: problems,
  };
}

// ---------------------------------------------------------------------------
// WhatsApp duty roster (who answers each WhatsApp button) and the management report
// ---------------------------------------------------------------------------
export async function saveDutyRoster(_: ContentState, fd: FormData): Promise<ContentState> {
  const { user } = await requireSales();
  const { TEAM_LABEL } = await import("@/lib/dutyTeams");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const value: Record<string, { name: string; phone: string; on: boolean }> = {};
  for (const team of Object.keys(TEAM_LABEL)) {
    const phone = String(fd.get(`${team}_phone`) ?? "").replace(/[^\d+]/g, "");
    if (phone && phone.replace(/\D/g, "").length < 9) return { error: `${TEAM_LABEL[team as keyof typeof TEAM_LABEL]}: that number looks too short.` };
    value[team] = { name: String(fd.get(`${team}_name`) ?? "").trim().slice(0, 60), phone, on: fd.get(`${team}_on`) === "on" && !!phone };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("site_content").upsert({ key: "whatsapp_duty", value, updated_at: new Date().toISOString() });
  if (error) return { error: "Couldn't save the roster." };
  await admin.from("audit_log").insert({ actor: user.id, action: "duty_roster", entity: "site_content", detail: { title: "WhatsApp duty roster" } });
  revalidatePath("/admin");
  return { message: "Saved. WhatsApp buttons now go to the people on duty." };
}

export async function sendReportNow() {
  const { user } = await requireAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { managementReport } = await import("@/lib/jobs");
  const admin = createAdminClient();
  await managementReport(admin);
  await admin.from("audit_log").insert({ actor: user.id, action: "report_sent", entity: "report", detail: { title: "Monthly management report" } });
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Facilitators' lesson suggestions: approve (publishes it) or send back with a reason
// ---------------------------------------------------------------------------
export async function reviewProposal(_: ContentState, fd: FormData): Promise<ContentState> {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["admin", "content"].includes(profile?.role ?? "")) return { error: "Admins and content editors only." };
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (decision === "rejected" && !note) return { error: "Tell the facilitator why, so they can fix it." };
  const { error } = await supabase.rpc("review_proposal", { proposal: String(fd.get("id") ?? ""), decision, note });
  if (error) return { error: error.message.includes("not pending") ? "Someone has already reviewed this." : "Couldn't save the decision." };
  revalidatePath("/admin");
  return { message: decision === "approved" ? "Approved. It’s live for learners, and the facilitator has been told." : "Sent back to the facilitator with your note." };
}
