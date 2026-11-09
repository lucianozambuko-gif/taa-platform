import { NextResponse } from "next/server";
import { createAdminClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Verification pack for a QCTO/SETA visit: one row per assessed learner with evidence, attendance, assessor and moderator sign-off. */
export async function GET(req: Request) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["moderator", "admin"].includes(profile?.role ?? "")) return new NextResponse("Not allowed", { status: 403 });
  const course = new URL(req.url).searchParams.get("course");
  let q = supabase
    .from("enrolments")
    .select("id, user_id, course_id, company, created_at, result, result_note, assessed_by, assessed_at, poe_submitted_at, moderation, moderation_note, moderated_by, moderated_at, courses(title, code, saqa_id, nqf_level, credits, accreditation_body)")
    .not("result", "is", null);
  if (course) q = q.eq("course_id", course);
  const { data } = await q;
  const rows = data ?? [];
  const admin = createAdminClient();
  const ids = [...new Set(rows.flatMap((r) => [r.user_id, r.assessed_by, r.moderated_by]).filter(Boolean) as string[])];
  const [{ data: people }, { data: ev }, { data: sessions }, { data: att }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, full_name, phone").in("id", ids) : Promise.resolve({ data: [] }),
    rows.length ? supabase.from("assessment_evidence").select("enrolment_id, source").in("enrolment_id", rows.map((r) => r.id)) : Promise.resolve({ data: [] }),
    supabase.from("class_sessions").select("id, course_id"),
    rows.length ? supabase.from("attendance").select("session_id, user_id, present").in("user_id", rows.map((r) => r.user_id)) : Promise.resolve({ data: [] }),
  ]);
  const p = (id: string | null) => people?.find((x) => x.id === id);
  const header = ["Learner", "Phone", "Sponsor", "Programme", "Code", "SAQA ID", "NQF", "Credits", "Accrediting body", "Enrolled", "Learner declaration", "Learner evidence files", "Assessor evidence files", "Attendance", "Result", "Assessor", "Assessed", "Assessor note", "Moderation", "Moderator", "Moderated", "Moderator report", "Portfolio link"];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lines = rows.map((r) => {
    const c = r.courses as unknown as { title: string; code: string; saqa_id: string | null; nqf_level: string | null; credits: string | null; accreditation_body: string | null };
    const sess = (sessions ?? []).filter((s) => s.course_id === r.course_id).map((s) => s.id);
    const present = (att ?? []).filter((a) => a.user_id === r.user_id && a.present && sess.includes(a.session_id)).length;
    return [
      p(r.user_id)?.full_name, p(r.user_id)?.phone, r.company, c.title, c.code, c.saqa_id, c.nqf_level, c.credits, c.accreditation_body,
      r.created_at?.slice(0, 10), r.poe_submitted_at?.slice(0, 10) ?? "not signed",
      (ev ?? []).filter((x) => x.enrolment_id === r.id && x.source === "learner").length,
      (ev ?? []).filter((x) => x.enrolment_id === r.id && x.source === "assessor").length,
      sess.length ? `${present}/${sess.length}` : "",
      r.result === "competent" ? "Competent" : "Not yet competent", p(r.assessed_by)?.full_name, r.assessed_at?.slice(0, 10), r.result_note,
      r.moderation, p(r.moderated_by)?.full_name, r.moderated_at?.slice(0, 10), r.moderation_note, `${site}/poe/${r.id}`,
    ].map(cell).join(",");
  });
  await supabase.from("audit_log").insert({ actor: user.id, action: "verification_export", entity: "report", detail: { title: "Verification pack", rows: rows.length } });
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="verification-pack-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
