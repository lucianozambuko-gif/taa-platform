// Server-only: the header menu each signed-in staff role sees, built around the work that role does.
import type { createClient } from "@/lib/supabase/server";
import { loadWorkspace } from "@/lib/workspace";

type DB = Awaited<ReturnType<typeof createClient>>;
export type MenuLink = { href: string; label: string; count?: number; download?: boolean };
export type MenuItem = MenuLink | { label: string; count?: number; children: MenuLink[] };

const site: MenuLink = { href: "/", label: "View website" };
const guide: MenuLink = { href: "/admin/guide", label: "Staff guide" };
const account: MenuLink = { href: "/account", label: "My profile" };

async function count(q: PromiseLike<{ count: number | null }>) {
  try { return (await q).count ?? 0; } catch { return 0; }
}

/** Returns the menu for a signed-in user's role; visitors (no user) keep the public website menu. */
export async function menuFor(supabase: DB, userId: string, role: string | null | undefined): Promise<MenuItem[] | null> {
  switch (role) {
    case null:
    case undefined:
    case "learner": {
      const [unread, pending] = await Promise.all([
        count(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)),
        count(supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending")),
      ]);
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/courses", label: "My courses" },
        { href: "/dashboard/results", label: "Results & certificates" },
        { href: "/dashboard/payments", label: "Payments", count: pending },
        { href: "/dashboard/messages", label: "Messages", count: unread },
        { label: "More", children: [
          { href: "/account", label: "Profile & reminders" },
          { href: "/courses", label: "Find a course" },
          { href: "/faqs", label: "Help & FAQs" },
          site,
        ] },
      ];
    }
    case "facilitator": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/facilitator", label: "Overview" },
        { href: "/facilitator/learners", label: "My learners" },
        { href: "/facilitator/results", label: "To assess", count: c.toAssess },
        { href: "/facilitator/attendance", label: "Attendance" },
        { label: "Lessons", children: [
          { href: "/facilitator/lessons", label: "Lessons & quizzes" },
          { href: "/facilitator/lessons#new", label: "Suggest a new lesson" },
          { href: "/facilitator/quizzes", label: "Quiz results" },
          { href: "/facilitator/results?view=portfolios", label: "Portfolios" },
        ] },
        { label: "More", count: c.unread, children: [{ href: "/inbox", label: "Messages", count: c.unread }, account, guide, site] },
      ];
    }
    case "moderator": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/moderator", label: "Overview" },
        { href: "/moderator?view=queue", label: "To moderate", count: c.pending },
        { href: "/moderator?view=history", label: "Moderated" },
        { href: "/moderator/export", label: "Verification pack", download: true },
        { label: "More", count: c.unread, children: [{ href: "/inbox", label: "Messages", count: c.unread }, account, guide, site] },
      ];
    }
    case "employer": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/employer", label: "Overview" },
        { href: "/employer?view=staff", label: "My staff" },
        { href: "/employer?view=register", label: "Register staff" },
        { href: "/employer?view=requests", label: "Requests & quotes", count: c.open },
        { href: "/employer?view=reports", label: "Reports & B-BBEE" },
        { label: "More", count: c.unread, children: [
          { href: "/inbox", label: "Messages", count: c.unread },
          { href: "/courses", label: "Find a course" },
          { href: "/employers#estimate", label: "Group estimate" },
          account,
          site,
        ] },
      ];
    }
    case "content": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/content", label: "Overview" },
        { href: "/admin?tab=courses", label: "Courses & lessons" },
        { href: "/admin?tab=approvals", label: "Approvals", count: c.waiting },
        { label: "Website", children: [
          { href: "/admin?tab=content&view=news", label: "News & articles" },
          { href: "/content/media", label: "Media library" },
          { href: "/admin?tab=content", label: "Site content" },
          { href: "/admin?tab=content&view=seo", label: "SEO & redirects" },
          { href: "/campaigns", label: "Campaign pages" },
          site,
        ] },
        { label: "More", count: c.unread, children: [
          { href: "/facilitator/quizzes", label: "Quiz results" },
          { href: "/admin?tab=overview", label: "Reports" },
          { href: "/inbox", label: "Messages", count: c.unread },
          account,
          guide,
        ] },
      ];
    }
    case "sales": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/sales", label: "Overview" },
        { label: "Leads", count: c.fresh, children: [
          { href: "/admin?tab=leads", label: "Open leads", count: c.fresh },
          { href: "/admin?tab=leads&view=mine", label: "My leads", count: c.mine },
          { href: "/admin?tab=leads&view=unassigned", label: "Unassigned" },
          { href: "/admin?tab=leads&view=chats", label: "Advisor chats" },
          { href: "/campaigns", label: "Campaigns & sources" },
        ] },
        { href: "/admin?tab=orders", label: "Orders" },
        { href: "/admin?tab=venue", label: "Venue", count: c.venue },
        { label: "Customers", children: [
          { href: "/admin?tab=learners", label: "Learners & enrolments" },
          { href: "/admin/report", label: "Employers & reports" },
          { href: "/admin?tab=coupons", label: "Coupons" },
        ] },
        { label: "More", count: c.unread, children: [
          { href: "/admin?tab=overview", label: "Reports" },
          { href: "/inbox", label: "Messages", count: c.unread },
          account,
          guide,
          site,
        ] },
      ];
    }
    case "admin": {
      const c = (await loadWorkspace())?.counts ?? {};
      return [
        { href: "/admin", label: "Overview" },
        { label: "Sales", count: (c.fresh ?? 0) + (c.coupons ?? 0), children: [
          { href: "/sales", label: "Sales desk" },
          { href: "/admin?tab=leads", label: "Leads", count: c.fresh },
          { href: "/admin?tab=orders", label: "Orders & refunds" },
          { href: "/admin?tab=coupons", label: "Coupons", count: c.coupons },
          { href: "/admin?tab=venue", label: "Venue bookings" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/admin/report", label: "Employer reports" },
        ] },
        { label: "Learning", count: (c.moderation ?? 0) + (c.waiting ?? 0), children: [
          { href: "/admin?tab=learners", label: "Learners & progress" },
          { href: "/admin?tab=courses", label: "Courses & lessons" },
          { href: "/admin?tab=approvals", label: "Lesson approvals", count: c.waiting },
          { href: "/facilitator", label: "Teaching view" },
          { href: "/moderator", label: "Moderation", count: c.moderation },
        ] },
        { label: "Website", children: [
          { href: "/content", label: "Content studio" },
          { href: "/admin?tab=content", label: "Site content" },
          { href: "/content/media", label: "Media library" },
          site,
        ] },
        { label: "Admin", count: c.unread, children: [
          { href: "/admin?tab=users", label: "Users & roles" },
          { href: "/admin?tab=audit", label: "Audit log" },
          { href: "/inbox", label: "Messages", count: c.unread },
          account,
          guide,
        ] },
      ];
    }
    default:
      return null;
  }
}
