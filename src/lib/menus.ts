// Server-only: the header menu each signed-in staff role sees, built around the work that role does.
import type { createClient } from "@/lib/supabase/server";
import { teachingCounts } from "@/lib/teaching";

type DB = Awaited<ReturnType<typeof createClient>>;
export type MenuLink = { href: string; label: string; count?: number; download?: boolean };
export type MenuItem = MenuLink | { label: string; count?: number; children: MenuLink[] };

const site: MenuLink = { href: "/", label: "View website" };
const guide: MenuLink = { href: "/admin/guide", label: "Staff guide" };

async function count(q: PromiseLike<{ count: number | null }>) {
  try { return (await q).count ?? 0; } catch { return 0; }
}

/** Returns null for learners and visitors, who keep the public website menu. */
export async function menuFor(supabase: DB, userId: string, role: string | null | undefined): Promise<MenuItem[] | null> {
  switch (role) {
    case "facilitator": {
      const c = await teachingCounts(supabase, userId);
      return [
        { href: "/facilitator", label: "My learners" },
        { href: "/facilitator/results", label: "To assess", count: c.toAssess },
        { href: "/facilitator/attendance", label: "Attendance" },
        { href: "/facilitator/quizzes", label: "Quizzes" },
        { href: "/facilitator/results?view=portfolios", label: "Portfolios" },
        { label: "Help", children: [guide, site] },
      ];
    }
    case "moderator": {
      const pending = await count(supabase.from("enrolments").select("id", { count: "exact", head: true }).eq("moderation", "pending"));
      return [
        { href: "/moderator", label: "To moderate", count: pending },
        { href: "/moderator/export", label: "Verification pack", download: true },
        guide,
        site,
      ];
    }
    case "employer":
      return [
        { href: "/employer", label: "My staff" },
        { href: "/employer#register", label: "Register staff" },
        { href: "/employer#bbbee", label: "B-BBEE summary" },
        { href: "/courses", label: "Find a course" },
        { href: "/employers#estimate", label: "Group estimate" },
      ];
    case "content":
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin?tab=courses", label: "Courses & lessons" },
        { href: "/facilitator/quizzes", label: "Quiz results" },
        { label: "Website", children: [
          { href: "/admin?tab=content", label: "Homepage & banner" },
          { href: "/admin?tab=content#news", label: "News & articles" },
          { href: "/admin?tab=content#faqs", label: "FAQs" },
          { href: "/admin?tab=content#seo", label: "Page titles & SEO" },
          { href: "/admin?tab=content#redirects", label: "Redirects" },
          site,
        ] },
        guide,
      ];
    case "sales": {
      const fresh = await count(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"));
      return [
        { href: "/admin", label: "Dashboard" },
        { label: "Leads", count: fresh, children: [
          { href: "/admin?tab=leads", label: "Open leads", count: fresh },
          { href: "/admin?tab=leads&view=mine", label: "Assigned to me" },
          { href: "/admin?tab=leads&view=unassigned", label: "Unassigned" },
          { href: "/admin?tab=leads&view=chats", label: "Advisor chats" },
          { href: "/admin?tab=leads#duty", label: "WhatsApp duty roster" },
        ] },
        { href: "/admin?tab=orders", label: "Orders" },
        { label: "Learners", children: [
          { href: "/admin?tab=learners", label: "Learners & progress" },
          { href: "/admin?tab=learners#bulk", label: "Enrol staff in bulk" },
          { href: "/admin/report", label: "Employer reports" },
        ] },
        { href: "/admin?tab=venue", label: "Venue" },
        { href: "/admin?tab=coupons", label: "Coupons" },
        { label: "Help", children: [guide, site] },
      ];
    }
    case "admin": {
      const [fresh, coupons, moderation] = await Promise.all([
        count(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new")),
        count(supabase.from("coupons").select("id", { count: "exact", head: true }).eq("status", "pending")),
        count(supabase.from("enrolments").select("id", { count: "exact", head: true }).eq("moderation", "pending")),
      ]);
      return [
        { href: "/admin", label: "Dashboard" },
        { label: "Sales", count: fresh + coupons, children: [
          { href: "/admin?tab=leads", label: "Leads", count: fresh },
          { href: "/admin?tab=leads&view=chats", label: "Advisor chats" },
          { href: "/admin?tab=orders", label: "Orders & refunds" },
          { href: "/admin?tab=coupons", label: "Coupons", count: coupons },
          { href: "/admin?tab=venue", label: "Venue bookings" },
          { href: "/admin/report", label: "Employer reports" },
        ] },
        { label: "Learning", count: moderation, children: [
          { href: "/admin?tab=learners", label: "Learners & progress" },
          { href: "/admin?tab=courses", label: "Courses & lessons" },
          { href: "/facilitator/quizzes", label: "Quiz results" },
          { href: "/facilitator", label: "Teaching view" },
          { href: "/moderator", label: "Moderation", count: moderation },
        ] },
        { label: "Website", children: [
          { href: "/admin?tab=content", label: "Site content" },
          { href: "/admin?tab=content#faqs", label: "FAQs" },
          { href: "/admin?tab=content#seo", label: "Page titles & SEO" },
          site,
        ] },
        { label: "Admin", children: [
          { href: "/admin?tab=users", label: "Users & roles" },
          { href: "/admin?tab=audit", label: "Audit log" },
          guide,
        ] },
      ];
    }
    default:
      return null;
  }
}
