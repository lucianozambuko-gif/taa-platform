// Server-only helpers for the facilitator area: what each facilitator teaches and what is waiting for them.
import type { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";

type DB = Awaited<ReturnType<typeof createClient>>;
export type TCourse = Course & { modules: { lessons: { id: string }[] }[] };
export type TRow = {
  id: string; user_id: string; course_id: string; created_at: string; result: string | null; result_note: string | null;
  assessed_at: string | null; poe_submitted_at: string | null; moderation: string | null; moderation_note: string | null;
  course: TCourse; pct: number | null; name: string; phone: string | null; evidence: number; last: string | null;
};

/** Courses this facilitator teaches (admins: all) with every enrolment and its progress. */
export async function loadTeaching(supabase: DB, userId: string, isAdmin: boolean) {
  let ids: string[] | null = null;
  if (!isAdmin) ids = ((await supabase.from("course_facilitators").select("course_id").eq("user_id", userId)).data ?? []).map((r) => r.course_id);
  let q = supabase.from("courses").select("*, modules(lessons(id))").order("title");
  if (ids) q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const courses = ((await q).data ?? []) as unknown as TCourse[];
  if (!courses.length) return { courses, rows: [] as TRow[] };
  const { data: enrols } = await supabase
    .from("enrolments")
    .select("id, user_id, course_id, created_at, result, result_note, assessed_at, poe_submitted_at, moderation, moderation_note")
    .in("course_id", courses.map((c) => c.id));
  const users = [...new Set((enrols ?? []).map((e) => e.user_id))];
  const [{ data: people }, { data: prog }, { data: ev }] = users.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", users),
        supabase.from("lesson_progress").select("user_id, lesson_id, completed_at").in("user_id", users),
        supabase.from("assessment_evidence").select("enrolment_id").in("enrolment_id", (enrols ?? []).map((e) => e.id)),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const rows: TRow[] = (enrols ?? []).map((e) => {
    const course = courses.find((c) => c.id === e.course_id)!;
    const lessonIds = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    const mine = (prog ?? []).filter((p) => p.user_id === e.user_id && lessonIds.has(p.lesson_id));
    const done = mine.length;
    const person = (people ?? []).find((p) => p.id === e.user_id);
    return {
      ...e, course, pct: course.has_lms && lessonIds.size ? Math.min(100, Math.round((done / lessonIds.size) * 100)) : null,
      name: person?.full_name ?? "Learner", phone: person?.phone ?? null,
      evidence: (ev ?? []).filter((x) => x.enrolment_id === e.id).length,
      last: mine.map((p) => (p as { completed_at?: string | null }).completed_at ?? "").sort().at(-1) || null,
    };
  });
  return { courses, rows };
}

/** Assessed by a person (not an automatic certificate) and ready: online part finished, or a classroom programme. */
export const needsResult = (r: TRow) => !r.result && !(r.course.certificate_auto && r.course.has_lms) && (r.pct === null || r.pct === 100);
export const referred = (r: TRow) => r.moderation === "referred";

/** The number on the "To assess" menu item. */
export async function teachingCounts(supabase: DB, userId: string) {
  try {
    const { rows } = await loadTeaching(supabase, userId, false);
    return { toAssess: rows.filter((r) => needsResult(r) || referred(r)).length };
  } catch {
    return { toAssess: 0 };
  }
}
