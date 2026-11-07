import { createClient } from "@/lib/supabase/server";
import type { Course, Module } from "@/lib/types";

export type CourseFilters = {
  q?: string;
  subject?: string;
  kind?: string;
  format?: string;
  location?: string;
  learner?: string;
  max?: string;
};

export async function listCourses(filters: CourseFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("courses").select("*").eq("published", true).order("featured", { ascending: false }).order("title");
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.format) query = query.eq("format", filters.format);
  if (filters.location) query = query.eq("location", filters.location);
  if (filters.learner) query = query.contains("learner_types", [filters.learner]);
  if (filters.max && Number(filters.max) > 0) {
    query = query.or(`price_cents.lte.${Number(filters.max) * 100},price_cents.is.null`);
  }
  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,code.ilike.%${term}%,subject.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourse(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  return (data as Course | null) ?? null;
}

export async function getOutline(courseId: string): Promise<Module[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, position, title, lessons(id, position, title, kind, minutes)")
    .eq("course_id", courseId)
    .order("position");
  return ((data ?? []) as Module[]).map((m) => ({
    ...m,
    lessons: [...m.lessons].sort((a, b) => a.position - b.position),
  }));
}

export async function relatedCourses(course: Course, limit = 2) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("published", true)
    .eq("subject", course.subject)
    .neq("id", course.id)
    .limit(limit);
  return (data ?? []) as Course[];
}
