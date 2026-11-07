"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/format";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** App-style navigation for signed-in learners on phones. */
export default function BottomNav({ role = "learner" }: { role?: string }) {
  const path = usePathname();
  const teach = role === "facilitator";
  const is = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));
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
