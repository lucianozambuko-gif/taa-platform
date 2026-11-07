import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

/** XML sitemap of public pages and published courses (F12). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages = ["", "/courses", "/online-learning", "/employers", "/learnerships", "/pathways", "/venue", "/about", "/facilitators", "/faqs", "/news", "/contact", "/privacy"];
  let courses: { slug: string; updated_at: string }[] = [];
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    const { data } = await supabase.from("courses").select("slug, updated_at").eq("published", true);
    courses = data ?? [];
  } catch {
    // Sitemap still lists the fixed pages if the database is unreachable.
  }
  return [
    ...pages.map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...courses.map((c) => ({ url: `${site}/courses/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
