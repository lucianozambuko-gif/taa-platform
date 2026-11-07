"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { whatsappLink } from "@/lib/format";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** App-style navigation for signed-in users on phones; admins get their control panel instead of learner links. */
export default function BottomNav({ role = "learner" }: { role?: string }) {
  const path = usePathname();
  const tab = useSearchParams().get("tab") ?? "overview";
  const is = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  if (role === "admin") {
    const on = (t: string) => (path === "/admin" && tab === t) || (t === "courses" && path.startsWith("/admin/courses")) ? "page" : undefined;
    return (
      <nav className="bottom-nav" aria-label="Admin navigation">
        <Link href="/admin" aria-current={on("overview")}>
          <svg {...ICON}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>Overview
        </Link>
        <Link href="/admin?tab=leads" aria-current={on("leads")}>
          <svg {...ICON}><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></svg>Leads
        </Link>
        <Link href="/admin?tab=courses" aria-current={on("courses")}>
          <svg {...ICON}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>Courses
        </Link>
        <Link href="/admin?tab=users" aria-current={on("users")}>
          <svg {...ICON}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></svg>Users
        </Link>
      </nav>
    );
  }

  const teach = role === "facilitator";
  return (
    <nav className="bottom-nav" aria-label="Learner navigation">
      <Link href="/" aria-current={is("/") ? "page" : undefined}>
        <svg {...ICON}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>Home
      </Link>
      <Link href="/courses" aria-current={is("/courses") ? "page" : undefined}>
        <svg {...ICON}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>Courses
      </Link>
      {teach ? (
        <Link href="/facilitator" aria-current={is("/facilitator") ? "page" : undefined}>
          <svg {...ICON}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6h5M16 10h5M17 14h4" /></svg>Teaching
        </Link>
      ) : (
        <Link href="/dashboard" aria-current={is("/dashboard") || is("/learn") || is("/certificate") ? "page" : undefined}>
          <svg {...ICON}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>My learning
        </Link>
      )}
      <a href={whatsappLink("Hi Training Africa Academy, I need help with my course.")} target="_blank" rel="noopener">
        <svg {...ICON}><path d="M4 20l1.3-4A8 8 0 1 1 8 19z" /><path d="M9 10h.01M12 10h.01M15 10h.01" /></svg>Help
      </a>
    </nav>
  );
}
