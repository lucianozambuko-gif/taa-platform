"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalCounts = { courses: number; certificates: number; due: number; unread: number };

const ITEMS: { href: string; label: string; key?: keyof PortalCounts; icon: React.ReactNode }[] = [
  { href: "/dashboard", label: "Overview", icon: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></> },
  { href: "/dashboard/courses", label: "My courses", key: "courses", icon: <><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></> },
  { href: "/dashboard/results", label: "Results & certificates", key: "certificates", icon: <><circle cx="12" cy="9" r="5" /><path d="M8.5 13l-1.5 8 5-3 5 3-1.5-8" /></> },
  { href: "/dashboard/payments", label: "Payments & receipts", key: "due", icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></> },
  { href: "/dashboard/messages", label: "Messages", key: "unread", icon: <><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></> },
  { href: "/account", label: "Profile & reminders", icon: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></> },
];

/** The student portal's own navigation: a sidebar on computers, a scrolling tab row on phones. */
export default function PortalNav({ counts }: { counts: PortalCounts }) {
  const path = usePathname();
  return (
    <nav className="portal-nav" aria-label="Student portal">
      {ITEMS.map((i) => {
        const on = i.href === "/dashboard" ? path === "/dashboard" : path.startsWith(i.href);
        const n = i.key ? counts[i.key] : 0;
        const alert = i.key === "due" || i.key === "unread";
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{i.icon}</svg>
            <span>{i.label}</span>
            {n > 0 && <span className={`pcount${alert ? " alert" : ""}`} aria-label={`${n}`}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
