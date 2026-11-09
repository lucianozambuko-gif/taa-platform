import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

/** Main pages with default titles and search descriptions. Content editors can override them in the back office. */
export const SEO_PAGES: { path: string; title: string; description: string }[] = [
  { path: "/", title: "Training Africa Academy | Skills training in Johannesburg and online", description: "Short skills courses, accredited programmes and learnerships in Johannesburg and online, with clear prices, real dates and online learning you can start today." },
  { path: "/courses", title: "Find a course", description: "Search and filter every Training Africa Academy course by subject, accreditation, NQF level, format, location, price, duration and start date." },
  { path: "/online-learning", title: "Online learning", description: "Self-paced online courses you can study on your phone, with videos, downloads, quizzes and a certificate on completion where approved." },
  { path: "/employers", title: "Training for employers", description: "Group quotes, on-site training and progress reporting for HR, L&D and operations teams. Register several staff at once." },
  { path: "/learnerships", title: "Qualifications and learnerships", description: "Full qualifications and learnerships with entry criteria, intakes and how to apply." },
  { path: "/pathways", title: "Career and learning pathways", description: "Courses grouped in order for cleaning, team leaders and workplace safety careers." },
  { path: "/venue", title: "Assessment centre and venue hire", description: "Training rooms, a practical cleaning lab and a computer room in Johannesburg. Check availability and request a booking." },
  { path: "/facilitators", title: "Facilitators and training approach", description: "Who teaches at Training Africa Academy and how our practical, workplace-focused training works." },
  { path: "/about", title: "About and accreditations", description: "About Training Africa Academy and the accreditations behind our programmes." },
  { path: "/data-free", title: "Data-free learning and data saver", description: "Study on prepaid data: data saver mode, light pages, offline lessons and a data-free address." },
  { path: "/faqs", title: "Resources and FAQs", description: "Answers about enrolling, paying, accreditation, practicals, employer bookings and your personal information." },
  { path: "/news", title: "News and insights", description: "Intakes, training advice and news from Training Africa Academy." },
  { path: "/contact", title: "Contact and locations", description: "Contact Training Africa Academy by phone, WhatsApp or email, or visit our Johannesburg centre." },
  { path: "/privacy", title: "Privacy notice", description: "How Training Africa Academy collects, uses and protects your personal information under POPIA." },
  { path: "/terms", title: "Terms and learner policies", description: "Enrolment terms, payments and refunds, learner conduct, assessment and certificate policies." },
];

export type SeoOverrides = Record<string, { title?: string; description?: string }>;

export async function getSeoOverrides(): Promise<SeoOverrides> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("value").eq("key", "seo").maybeSingle();
    return (data?.value as SeoOverrides) ?? {};
  } catch {
    return {};
  }
}

export async function seoFor(path: string): Promise<Metadata> {
  const base = SEO_PAGES.find((p) => p.path === path);
  const o = (await getSeoOverrides())[path] ?? {};
  const title = o.title || base?.title || "Training Africa Academy";
  const description = o.description || base?.description;
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Training Africa Academy", type: "website", locale: "en_ZA" },
  };
}
