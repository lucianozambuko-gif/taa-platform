// Server-only: each staff role's own workspace (who is signed in, their menu and the live counts on it).
// Loaded once per request and shared by the header menu, the side menu and the phone bar.
import { cache } from "react";
import { getUserAndProfile } from "@/lib/supabase/server";
import { WORKSPACE_LABEL, homeFor, type Role } from "@/lib/roles";
import { loadTeaching, needsResult, referred } from "@/lib/teaching";

export type WorkIcon =
  | "home" | "people" | "check" | "folder" | "calendar" | "book" | "quiz" | "mail" | "guide" | "user" | "shield" | "history"
  | "download" | "plus" | "chart" | "inbox" | "receipt" | "building" | "tag" | "megaphone" | "pen" | "image" | "news" | "search"
  | "approve" | "globe" | "key" | "log" | "chat" | "calc";

export type WorkItem = {
  href: string;
  label: string;
  icon: WorkIcon;
  /** Number shown on the right; `alert` makes it red (something is waiting for this person). */
  count?: number;
  alert?: boolean;
  /** Extra path prefixes that keep this item highlighted (for example a course editor under "Courses"). */
  match?: string[];
  /** A file download rather than a page. */
  download?: boolean;
  /** Leaves the workspace for the public website. */
  external?: boolean;
};
export type WorkGroup = { title?: string; items: WorkItem[] };

type Q = PromiseLike<{ count: number | null }>;
async function n(q: Q) {
  try { return (await q).count ?? 0; } catch { return 0; }
}

const guide: WorkItem = { href: "/admin/guide", label: "Staff guide", icon: "guide" };
const profile: WorkItem = { href: "/account", label: "My profile", icon: "user" };

/** The signed-in person's workspace, or null for visitors and learners (learners use the student portal). */
export const loadWorkspace = cache(async () => {
  const { supabase, user, profile: me } = await getUserAndProfile();
  const role = (me?.role ?? "learner") as Role;
  if (!user || role === "learner" || !(role in WORKSPACE_LABEL)) return null;
  const uid = user.id;
  const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });
  const unreadQ = n(head("notifications").eq("user_id", uid).is("read_at", null));
  const inbox = (unread: number): WorkItem => ({ href: "/inbox", label: "Messages", icon: "mail", count: unread, alert: true });

  let groups: WorkGroup[] = [];
  let counts: Record<string, number> = {};

  if (role === "facilitator") {
    const [unread, teaching, proposals] = await Promise.all([
      unreadQ,
      loadTeaching(supabase, uid, false).catch(() => ({ courses: [], rows: [] })),
      n(head("lesson_proposals").eq("proposed_by", uid).eq("status", "pending")),
    ]);
    const toAssess = teaching.rows.filter((r) => needsResult(r) || referred(r)).length;
    const learners = new Set(teaching.rows.map((r) => r.user_id)).size;
    counts = { toAssess, learners, proposals, unread, courses: teaching.courses.length };
    groups = [
      { items: [
        { href: "/facilitator", label: "Overview", icon: "home" },
        { href: "/facilitator/learners", label: "My learners", icon: "people", count: learners },
        { href: "/facilitator/results", label: "To assess", icon: "check", count: toAssess, alert: true },
        { href: "/facilitator/results?view=portfolios", label: "Portfolios", icon: "folder" },
        { href: "/facilitator/attendance", label: "Attendance", icon: "calendar" },
        { href: "/facilitator/lessons", label: "Lessons & quizzes", icon: "book", count: proposals },
        { href: "/facilitator/quizzes", label: "Quiz results", icon: "quiz" },
        inbox(unread),
      ] },
      { items: [guide, profile] },
    ];
  } else if (role === "moderator") {
    const [unread, pending, referredBack] = await Promise.all([
      unreadQ,
      n(head("enrolments").eq("moderation", "pending")),
      n(head("enrolments").eq("moderation", "referred")),
    ]);
    counts = { pending, referredBack, unread };
    groups = [
      { items: [
        { href: "/moderator", label: "Overview", icon: "home" },
        { href: "/moderator?view=queue", label: "To moderate", icon: "shield", count: pending, alert: true, match: ["/poe"] },
        { href: "/moderator?view=history", label: "Moderated", icon: "history" },
        { href: "/moderator/export", label: "Verification pack", icon: "download", download: true },
        inbox(unread),
      ] },
      { items: [guide, profile] },
    ];
  } else if (role === "employer") {
    const { data: mine } = await supabase.from("profiles").select("company").eq("id", uid).maybeSingle();
    const company: string | null = mine?.company ?? null;
    const [unread, staffRows, requests] = await Promise.all([
      unreadQ,
      company ? supabase.from("enrolments").select("user_id").eq("company", company).then((r) => r.data ?? [], () => []) : Promise.resolve([]),
      // Needs migration 0016; until it is applied the count is simply left off.
      supabase.rpc("employer_requests").then((r) => (r.error ? [] : ((r.data ?? []) as { status: string }[])), () => []),
    ]);
    const staff = new Set((staffRows as { user_id: string }[]).map((r) => r.user_id)).size;
    const open = requests.filter((r) => !["won", "lost"].includes(r.status)).length;
    counts = { staff, open, unread };
    groups = [
      { items: [
        { href: "/employer", label: "Overview", icon: "home" },
        { href: "/employer?view=staff", label: "My staff", icon: "people", count: staff },
        { href: "/employer?view=register", label: "Register staff", icon: "plus" },
        { href: "/employer?view=requests", label: "Requests & quotes", icon: "receipt", count: open, alert: true },
        { href: "/employer?view=reports", label: "Reports & B-BBEE", icon: "chart" },
        inbox(unread),
      ] },
      { items: [
        { href: "/courses", label: "Find a course", icon: "search", external: true },
        { href: "/employers#estimate", label: "Group estimate", icon: "calc", external: true },
        profile,
      ] },
    ];
  } else if (role === "content") {
    const [unread, waiting, courses, drafts] = await Promise.all([
      unreadQ,
      n(head("lesson_proposals").eq("status", "pending")),
      n(head("courses")),
      n(head("posts").eq("published", false)),
    ]);
    counts = { waiting, courses, drafts, unread };
    groups = [
      { items: [
        { href: "/content", label: "Overview", icon: "home" },
        { href: "/admin?tab=courses", label: "Courses & lessons", icon: "book", count: courses, match: ["/admin/courses"] },
        { href: "/admin?tab=approvals", label: "Approvals", icon: "approve", count: waiting, alert: true },
        { href: "/facilitator/quizzes", label: "Quiz results", icon: "quiz" },
      ] },
      { title: "Website", items: [
        { href: "/admin?tab=content&view=news", label: "News & articles", icon: "news", count: drafts, match: ["/admin/posts"] },
        { href: "/content/media", label: "Media library", icon: "image" },
        { href: "/admin?tab=content", label: "Site content", icon: "pen" },
        { href: "/admin?tab=content&view=seo", label: "SEO & redirects", icon: "globe" },
        { href: "/campaigns", label: "Campaign pages", icon: "megaphone" },
      ] },
      { items: [{ href: "/admin?tab=overview", label: "Reports", icon: "chart" }, inbox(unread), guide, profile] },
    ];
  } else if (role === "sales") {
    const [unread, fresh, mine, venue, unpaid] = await Promise.all([
      unreadQ,
      n(head("leads").eq("status", "new")),
      n(head("leads").eq("assigned_to", uid).in("status", ["new", "contacted", "quoted"])),
      n(head("leads").eq("type", "venue").eq("status", "new")),
      n(head("orders").eq("status", "pending")),
    ]);
    counts = { fresh, mine, venue, unpaid, unread };
    groups = [
      { items: [
        { href: "/sales", label: "Overview", icon: "home" },
        { href: "/admin?tab=leads", label: "Leads", icon: "inbox", count: fresh, alert: true },
        { href: "/admin?tab=leads&view=mine", label: "My leads", icon: "user", count: mine },
        { href: "/admin?tab=leads&view=chats", label: "Advisor chats", icon: "chat" },
        { href: "/admin?tab=orders", label: "Orders & refunds", icon: "receipt", count: unpaid },
        { href: "/admin?tab=venue", label: "Venue bookings", icon: "calendar", count: venue, alert: true },
      ] },
      { title: "Customers", items: [
        { href: "/admin?tab=learners", label: "Learners & enrolments", icon: "people" },
        { href: "/admin/report", label: "Employers & reports", icon: "building" },
        { href: "/admin?tab=coupons", label: "Coupons", icon: "tag" },
        { href: "/campaigns", label: "Campaigns", icon: "megaphone" },
      ] },
      { items: [{ href: "/admin?tab=overview", label: "Reports", icon: "chart" }, inbox(unread), guide, profile] },
    ];
  } else {
    const [unread, fresh, coupons, moderation, waiting] = await Promise.all([
      unreadQ,
      n(head("leads").eq("status", "new")),
      n(head("coupons").eq("status", "pending")),
      n(head("enrolments").eq("moderation", "pending")),
      n(head("lesson_proposals").eq("status", "pending")),
    ]);
    counts = { fresh, coupons, moderation, waiting, unread };
    groups = [
      { items: [{ href: "/admin", label: "Overview", icon: "home" }] },
      { title: "Sales", items: [
        { href: "/sales", label: "Sales desk", icon: "chart" },
        { href: "/admin?tab=leads", label: "Leads", icon: "inbox", count: fresh, alert: true },
        { href: "/admin?tab=orders", label: "Orders & refunds", icon: "receipt" },
        { href: "/admin?tab=venue", label: "Venue bookings", icon: "calendar" },
        { href: "/admin?tab=coupons", label: "Coupons", icon: "tag", count: coupons, alert: true },
        { href: "/campaigns", label: "Campaigns", icon: "megaphone" },
        { href: "/admin/report", label: "Employer reports", icon: "building" },
      ] },
      { title: "Learning", items: [
        { href: "/admin?tab=learners", label: "Learners & progress", icon: "people" },
        { href: "/admin?tab=courses", label: "Courses & lessons", icon: "book", match: ["/admin/courses"] },
        { href: "/admin?tab=approvals", label: "Lesson approvals", icon: "approve", count: waiting, alert: true },
        { href: "/facilitator", label: "Teaching view", icon: "check", match: ["/facilitator"] },
        { href: "/moderator", label: "Moderation", icon: "shield", count: moderation, alert: true },
      ] },
      { title: "Website", items: [
        { href: "/content", label: "Content studio", icon: "pen" },
        { href: "/admin?tab=content", label: "Site content", icon: "news", match: ["/admin/posts"] },
        { href: "/content/media", label: "Media library", icon: "image" },
      ] },
      { title: "Administration", items: [
        { href: "/admin?tab=users", label: "Users & roles", icon: "key" },
        { href: "/admin?tab=audit", label: "Audit log", icon: "log" },
        inbox(unread),
        guide,
        profile,
      ] },
    ];
  }

  const name: string = me?.full_name || user.email || "Staff";
  return {
    supabase, user, role, name, counts, groups,
    firstName: (me?.full_name ?? "").split(" ")[0] || "there",
    label: WORKSPACE_LABEL[role],
    home: homeFor(role),
  };
});
export type Work = NonNullable<Awaited<ReturnType<typeof loadWorkspace>>>;
