// Server-only: everything the student portal shows, loaded once per page.
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { isBackOffice } from "@/lib/roles";
import type { Course } from "@/lib/types";

type L = { id: string; title: string; position: number; minutes: number; kind: string };
type Raw = {
  id: string; created_at: string; result: string | null; result_note: string | null; moderation: string | null; poe_submitted_at: string | null;
  courses: Course & { modules: { position: number; title: string; lessons: L[] }[] };
};

export async function loadStudent(next = "/dashboard") {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile?.role === "facilitator") redirect("/facilitator");
  if (profile?.role === "moderator") redirect("/moderator");
  if (isBackOffice(profile?.role)) redirect("/admin");
  if (profile?.role === "employer") redirect("/employer");

  const [{ data: enrolments }, { data: progress }, { data: orderRows }, { data: messages }, { data: attempts }] = await Promise.all([
    supabase
      .from("enrolments")
      .select("id, created_at, result, result_note, moderation, poe_submitted_at, courses(*, modules(position, title, lessons(id, title, position, minutes, kind)))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("lesson_progress").select("lesson_id, completed_at, score").eq("user_id", user.id),
    supabase
      .from("orders")
      .select("id, invoice_no, status, amount_cents, instalments, instalment_no, plan_id, plan_total_cents, paid_at, created_at, courses(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("notifications").select("id, subject, body, link, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("quiz_attempts").select("lesson_id, score, passed, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
  ]);

  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const lastTouched = new Map((progress ?? []).map((p) => [p.lesson_id, p.completed_at as string]));

  const courses = ((enrolments ?? []) as unknown as Raw[]).map((e) => {
    const modules = [...e.courses.modules].sort((a, b) => a.position - b.position).map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.position - b.position) }));
    const ordered = modules.flatMap((m) => m.lessons);
    const ids = ordered.map((l) => l.id);
    const doneCount = ids.filter((id) => done.has(id)).length;
    const pct = ids.length ? Math.round((doneCount / ids.length) * 100) : 0;
    const next = ordered.find((l) => !done.has(l.id));
    const minutesLeft = ordered.filter((l) => !done.has(l.id)).reduce((a, l) => a + l.minutes, 0);
    const last = ids.map((id) => lastTouched.get(id) ?? "").sort().at(-1) || e.created_at;
    const certificateReady = (e.courses.has_lms && pct === 100 && e.courses.certificate_auto) || (e.result === "competent" && e.moderation === "endorsed");
    return { ...e, modules, ordered, doneCount, total: ids.length, pct, next, minutesLeft, last, certificateReady };
  });
  const current = courses.filter((r) => r.courses.has_lms && r.pct < 100).sort((a, b) => b.last.localeCompare(a.last))[0];

  // Payment plans with instalments still to pay
  const plans = new Map<string, { id: string; title: string; total: number; paid: number; count: number; of: number; lastPaid: string | null }>();
  for (const o of orderRows ?? []) {
    if (!o.plan_id || o.instalments < 2) continue;
    const p = plans.get(o.plan_id) ?? { id: o.plan_id, title: (o.courses as unknown as { title: string }).title, total: o.plan_total_cents ?? 0, paid: 0, count: 0, of: o.instalments, lastPaid: null };
    if (o.status === "paid") {
      p.paid += o.amount_cents;
      p.count += 1;
      if (!p.lastPaid || (o.paid_at ?? "") > p.lastPaid) p.lastPaid = o.paid_at;
    }
    plans.set(o.plan_id, p);
  }
  const duePlans = [...plans.values()]
    .filter((p) => p.count > 0 && p.count < p.of)
    .map((p) => ({ ...p, due: p.lastPaid ? new Date(new Date(p.lastPaid).getTime() + 30 * 864e5) : null, nextAmount: Math.ceil((p.total - p.paid) / (p.of - p.count)) }));

  // Quiz results: best score per quiz, with the course and lesson it belongs to
  const lessonInfo = new Map<string, { title: string; course: string }>();
  courses.forEach((c) => c.ordered.forEach((l) => lessonInfo.set(l.id, { title: l.title, course: c.courses.title })));
  const best = new Map<string, { score: number; passed: boolean; tries: number; at: string }>();
  for (const a of attempts ?? []) {
    const b = best.get(a.lesson_id);
    if (!b) best.set(a.lesson_id, { score: a.score, passed: a.passed, tries: 1, at: a.created_at });
    else best.set(a.lesson_id, { ...b, score: Math.max(b.score, a.score), passed: b.passed || a.passed, tries: b.tries + 1 });
  }
  const quizzes = [...best.entries()].filter(([id]) => lessonInfo.has(id)).map(([id, b]) => ({ id, ...lessonInfo.get(id)!, ...b }));

  // Next-course recommendations from the subjects the learner already studies
  const enrolledIds = courses.map((r) => r.courses.id);
  const subjects = [...new Set(courses.map((r) => r.courses.subject))];
  const { data: recs } = subjects.length
    ? await supabase.from("courses").select("*").eq("published", true).in("subject", subjects).limit(8)
    : await supabase.from("courses").select("*").eq("published", true).eq("featured", true).limit(4);
  let recommendations = ((recs ?? []) as Course[]).filter((c) => !enrolledIds.includes(c.id));
  if (recommendations.length < 3) {
    const { data: more } = await supabase.from("courses").select("*").eq("published", true).eq("featured", true).limit(6);
    recommendations = [...recommendations, ...((more ?? []) as Course[]).filter((c) => !enrolledIds.includes(c.id) && !recommendations.some((r) => r.id === c.id))];
  }

  const unread = (messages ?? []).filter((m) => !m.read_at).length;
  const name: string = profile?.full_name || user.email || "Learner";
  return {
    supabase, user, profile, name, firstName: (profile?.full_name ?? "").split(" ")[0] || "there",
    courses, current, orders: orderRows ?? [], duePlans, messages: messages ?? [], unread, quizzes,
    recommendations: recommendations.slice(0, 3),
    lessonsDone: done.size,
    done,
    certificates: courses.filter((c) => c.certificateReady),
  };
}
export type Student = Awaited<ReturnType<typeof loadStudent>>;
