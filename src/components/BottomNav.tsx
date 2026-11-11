"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** App-style navigation for signed-in users on phones: each role gets the bar for its own workspace. */
type Labels = { home: string; courses: string; learning: string; help: string };
const EN: Labels = { home: "Home", courses: "Courses", learning: "My learning", help: "Help" };

// Phone bars for staff and employers: [link, label, icon, count shown as a red dot, other paths that keep it lit]
type Item = [href: string, label: string, icon: keyof typeof I, count?: string, deep?: string[]];
const I = {
  home: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></>,
  check: <><path d="M9 12l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  book: <><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></>,
  shield: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 4v4.5H8" /><path d="M12 7.5V12l3 2" /></>,
  mail: <><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  approve: <path d="M4 12.5l4.5 4.5L20 6" />,
  pen: <><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 4" /></>,
  inbox: <><path d="M4 13l2.5-8h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1 2.5h5l1-2.5H20" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8.5-8.5M16 7l2.5 2.5" /></>,
};
const STAFF: Record<string, Item[]> = {
  facilitator: [
    ["/facilitator", "Home", "home"],
    ["/facilitator/learners", "Learners", "people"],
    ["/facilitator/results", "To assess", "check", "toAssess", ["/poe"]],
    ["/facilitator/attendance", "Register", "calendar"],
    ["/facilitator/lessons", "Lessons", "book", undefined, ["/facilitator/quizzes"]],
  ],
  moderator: [
    ["/moderator", "Home", "home"],
    ["/moderator?view=queue", "To moderate", "shield", "pending", ["/poe"]],
    ["/moderator?view=history", "Moderated", "history"],
    ["/inbox", "Messages", "mail", "unread"],
  ],
  employer: [
    ["/employer", "Home", "home"],
    ["/employer?view=staff", "My staff", "people"],
    ["/employer?view=register", "Register", "plus"],
    ["/employer?view=requests", "Requests", "receipt", "open"],
    ["/employer?view=reports", "Reports", "chart"],
  ],
  content: [
    ["/content", "Home", "home"],
    ["/admin?tab=courses", "Courses", "book", undefined, ["/admin/courses"]],
    ["/admin?tab=approvals", "Approvals", "approve", "waiting"],
    ["/admin?tab=content", "Website", "pen", undefined, ["/admin/posts"]],
    ["/content/media", "Media", "image"],
  ],
  sales: [
    ["/sales", "Home", "home"],
    ["/admin?tab=leads", "Leads", "inbox", "fresh"],
    ["/admin?tab=orders", "Orders", "receipt"],
    ["/admin?tab=venue", "Venue", "calendar", "venue"],
    ["/admin?tab=learners", "Learners", "people"],
  ],
  admin: [
    ["/admin", "Home", "home"],
    ["/admin?tab=leads", "Leads", "inbox", "fresh"],
    ["/admin?tab=courses", "Courses", "book", undefined, ["/admin/courses"]],
    ["/admin?tab=learners", "Learners", "people"],
    ["/admin?tab=users", "Users", "key"],
  ],
};

export default function BottomNav({ role = "learner", labels = EN, unread = 0, counts = {} }: { role?: string; labels?: Labels; unread?: number; counts?: Record<string, number> }) {
  const path = usePathname();
  const params = useSearchParams();

  const staff = STAFF[role];
  if (staff) {
    // Highlight the closest match: same page and the same tab / view.
    const cur = (k: string) => params.get(k) ?? (k === "tab" && path === "/admin" ? "overview" : null);
    const score = ([href, , , , deep]: Item) => {
      const [p, q] = href.split("?");
      const want = new URLSearchParams(q ?? "");
      if (p === "/admin" && !want.has("tab")) want.set("tab", "overview");
      if (path === p) return [...want].every(([k, v]) => cur(k) === v) ? 1000 + p.length * 10 + [...want].length : -1;
      const d = (deep ?? []).filter((m) => path === m || path.startsWith(m + "/")).sort((x, y) => y.length - x.length)[0];
      return d ? d.length : -1;
    };
    const best = staff.map(score).reduce((bi, sc, i, all) => (sc > all[bi] ? i : bi), 0);
    const any = staff.some((i) => score(i) >= 0);
    return (
      <nav className="bottom-nav" aria-label={`${role} navigation`}>
        {staff.map((item, i) => {
          const [href, label, icon, key] = item;
          const n = key ? counts[key] ?? 0 : 0;
          return (
            <Link key={href} href={href} aria-current={any && i === best ? "page" : undefined} aria-label={n ? `${label}, ${n} waiting` : undefined}>
              <span className="bn-icon">
                <svg {...ICON}>{I[icon]}</svg>
                {n > 0 && <span className="bn-dot">{n > 9 ? "9+" : n}</span>}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }
  const on = (p: string, exact = false) => (exact ? path === p : path.startsWith(p)) ? "page" : undefined;
  return (
    <nav className="bottom-nav" aria-label="Student portal navigation">
      <Link href="/dashboard" aria-current={on("/dashboard", true)}>
        <svg {...ICON}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>{labels.home}
      </Link>
      <Link href="/dashboard/courses" aria-current={on("/dashboard/courses") ?? on("/learn")}>
        <svg {...ICON}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>Courses
      </Link>
      <Link href="/dashboard/results" aria-current={on("/dashboard/results") ?? on("/certificate") ?? on("/poe")}>
        <svg {...ICON}><circle cx="12" cy="9" r="5" /><path d="M8.5 13l-1.5 8 5-3 5 3-1.5-8" /></svg>Results
      </Link>
      <Link href="/dashboard/payments" aria-current={on("/dashboard/payments") ?? on("/orders")}>
        <svg {...ICON}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>Payments
      </Link>
      <Link href="/dashboard/messages" aria-current={on("/dashboard/messages")} aria-label={unread ? `Messages, ${unread} unread` : "Messages"}>
        <span className="bn-icon">
          <svg {...ICON}><path d="M4 5h16v11H9l-5 4z" /></svg>
          {unread > 0 && <span className="bn-dot">{unread > 9 ? "9+" : unread}</span>}
        </span>
        Messages
      </Link>
    </nav>
  );
}
