import { createClient } from "@/lib/supabase/server";
import { getOutline } from "@/lib/courses";
import type { Course } from "@/lib/types";

/** Course, outline and the learner's completed lessons, or null if not enrolled. */
export async function getLearningState(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const { data: enrolment } = await supabase.from("enrolments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
  const outline = await getOutline(course.id);
  const lessonIds = outline.flatMap((m) => m.lessons.map((l) => l.id));
  const { data: progress } = lessonIds.length
    ? await supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string }[] };
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const lessons = outline.flatMap((m) => m.lessons);
  const pct = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
  return { supabase, user, course: course as Course, enrolled: !!enrolment, outline, lessons, done, pct };
}
