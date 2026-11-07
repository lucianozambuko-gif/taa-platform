import { createClient } from "@/lib/supabase/server";

export type Stat = { value: string; label: string };
export type Testimonial = { quote: string; name: string; role: string };
export type Announcement = { text: string; link: string; on: boolean };

export const DEFAULT_STATS: Stat[] = [
  { value: "[2,400+]", label: "learners trained" },
  { value: "[120+]", label: "employer clients" },
  { value: "[12]", label: "years training in Gauteng" },
  { value: "[94%]", label: "would recommend us" },
];

/** Homepage and banner content editable in the back office, with safe defaults. */
export async function getSiteContent() {
  const fallback = { stats: DEFAULT_STATS, testimonials: [] as Testimonial[], announcement: { text: "", link: "", on: false } as Announcement, sample: true };
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("key, value");
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    return {
      stats: (map.get("home_stats") as Stat[] | undefined) ?? fallback.stats,
      testimonials: (map.get("home_testimonials") as Testimonial[] | undefined) ?? fallback.testimonials,
      announcement: (map.get("announcement") as Announcement | undefined) ?? fallback.announcement,
      sample: (map.get("sample_figures") as boolean | undefined) ?? true,
    };
  } catch {
    return fallback;
  }
}
