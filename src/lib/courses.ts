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
  nqf?: string;
  duration?: string;
  intake?: string;
};

/** Duration bands for the catalogue filter, worked out from the course's duration text. */
export function durationBand(duration: string | null): "short" | "days" | "weeks" | "long" {
  const d = (duration ?? "").toLowerCase();
  if (/hour/.test(d) || /^1 day/.test(d)) return "short";
  if (/day/.test(d)) return "days";
  if (/week/.test(d)) return "weeks";
  return "long";
}
export const DURATION_BANDS: [string, string][] = [["short", "One day or less"], ["days", "A few days"], ["weeks", "Several weeks"], ["long", "Months (qualifications)"]];

/** Month labels like "Jan 2027" found in a course's intake dates; "anytime" for start-any-time courses. */
export function intakeKeys(intakes: string[]): string[] {
  return intakes.map((i) => {
    if (/any time/i.test(i)) return "anytime";
    const m = i.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{4})/i);
    return m ? `${m[1].slice(0, 3)} ${m[2]}` : i;
  });
}

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
  let rows = (data ?? []) as Course[];
  if (filters.nqf) rows = rows.filter((c) => c.accreditation_approved && c.nqf_level === filters.nqf);
  if (filters.duration) rows = rows.filter((c) => durationBand(c.duration) === filters.duration);
  if (filters.intake) rows = rows.filter((c) => intakeKeys(c.intakes).includes(filters.intake!));
  return rows;
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
