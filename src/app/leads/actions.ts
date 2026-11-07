"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { LEAD_LABEL, ROUTING } from "@/lib/format";
import { notify } from "@/lib/notify";

export type LeadState = { ok?: boolean; ref?: string; routedTo?: string; error?: string };

const TYPES = ["course_enquiry", "group_quote", "learnership", "venue", "multi_learner"] as const;
type LeadType = (typeof TYPES)[number];

function text(fd: FormData, key: string, max = 500) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

/** Records any enquiry form, tags it by type, course and source, and routes it to the right team. */
export async function submitLead(_: LeadState, fd: FormData): Promise<LeadState> {
  const type = text(fd, "type") as LeadType;
  if (!TYPES.includes(type)) return { error: "Unknown form type." };
  if (fd.get("popia") !== "on") return { error: "Please accept the privacy notice so we can contact you." };
  const name = text(fd, "name", 120);
  const email = text(fd, "email", 200);
  if (!name) return { error: "Please enter your name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };

  const supabase = createAdminClient();
  let courseId: string | null = null;
  const slug = text(fd, "course");
  if (slug) {
    const { data } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
    courseId = data?.id ?? null;
  }

  const details: Record<string, unknown> = {};
  for (const key of ["industry", "delivery", "note", "room", "date", "slot", "purpose", "education", "situation", "learners"]) {
    const value = text(fd, key, 4000);
    if (value) details[key] = value;
  }
  const staff = Number(fd.get("staff_count"));
  const routedTo = ROUTING[type];

  const { data, error } = await supabase
    .from("leads")
    .insert({
      type,
      name,
      email: email || null,
      phone: text(fd, "phone", 40) || null,
      company: text(fd, "company", 160) || null,
      course_id: courseId,
      staff_count: Number.isFinite(staff) && staff > 0 ? staff : null,
      details,
      source: text(fd, "source", 80) || "website",
      routed_to: routedTo,
      popia_consent: true,
    })
    .select("ref")
    .single();
  if (error || !data) return { error: "We couldn't save your request. Please try again, or WhatsApp us." };
  const label = LEAD_LABEL[type] ?? "Enquiry";
  if (email)
    await notify({
      toEmail: email, audience: "enquirer", kind: "lead_received",
      subject: `We received your ${label.toLowerCase()} (${data.ref})`,
      body: `Hi ${name.split(" ")[0]}, thank you for contacting Training Africa Academy. Your reference is ${data.ref}. Our ${routedTo.toLowerCase()} will reply within one working day.${type === "learnership" ? " Please have your ID and latest school results ready." : ""}`,
    });
  await notify({ audience: "staff", kind: "lead_new", subject: `New ${label.toLowerCase()} ${data.ref} for ${routedTo}`, body: `${name}${text(fd, "company", 160) ? ` · ${text(fd, "company", 160)}` : ""} · source ${text(fd, "source", 80) || "website"}`, link: "/admin?tab=leads" });
  return { ok: true, ref: data.ref, routedTo };
}
