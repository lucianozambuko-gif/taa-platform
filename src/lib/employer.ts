import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

export type StaffRow = {
  id: string; user_id: string; learner: string; phone: string | null; course: string; code: string; kind: string; price_cents: number | null;
  enrolled: string; pct: number | null; last: string | null; result: string | null; attended: number; sessions: number; status: string;
};

/** Everything an employer is allowed to see about their own staff (row-level security limits it to their company). */
export async function employerStaff(supabase: DB, company: string) {
  const { data: enrols } = await supabase
    .from("enrolments")
    .select("id, user_id, created_at, result, course_id, courses(title, code, kind, price_cents, certificate_auto, modules(lessons(id)))")
    .eq("company", company);
  type E = { id: string; user_id: string; created_at: string; result: string | null; course_id: string; courses: { title: string; code: string; kind: string; price_cents: number | null; certificate_auto: boolean; modules: { lessons: { id: string }[] }[] } };
  const rows = (enrols ?? []) as unknown as E[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const [{ data: profs }, { data: prog }, { data: sessions }, { data: att }] = ids.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase.from("lesson_progress").select("user_id, lesson_id, completed_at").in("user_id", ids),
        supabase.from("class_sessions").select("id, course_id").in("course_id", courseIds),
        supabase.from("attendance").select("session_id, user_id, present").in("user_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const who = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r): StaffRow => {
    const lessonIds = r.courses.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const mine = (prog ?? []).filter((p) => p.user_id === r.user_id && lessonIds.includes(p.lesson_id));
    const pct = lessonIds.length ? Math.round((mine.length / lessonIds.length) * 100) : null;
    const courseSessions = (sessions ?? []).filter((s) => s.course_id === r.course_id).map((s) => s.id);
    const attended = (att ?? []).filter((a) => a.user_id === r.user_id && a.present && courseSessions.includes(a.session_id)).length;
    const status =
      r.result === "competent" ? "Competent" : r.result === "not_yet_competent" ? "Not yet competent" : pct === 100 && r.courses.certificate_auto ? "Completed" : pct === null ? "Classroom" : pct === 0 ? "Not started" : "In progress";
    return {
      id: r.id, user_id: r.user_id, learner: who.get(r.user_id)?.full_name ?? "Learner", phone: who.get(r.user_id)?.phone ?? null,
      course: r.courses.title, code: r.courses.code, kind: r.courses.kind, price_cents: r.courses.price_cents, enrolled: r.created_at,
      pct, last: mine.map((p) => p.completed_at as string).sort().at(-1) ?? null, result: r.result, attended, sessions: courseSessions.length, status,
    };
  }).sort((a, b) => a.learner.localeCompare(b.learner));
}
