"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

/** Role menu links that show which page you're on. */
export default function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const view = useSearchParams().get("view");
  const current = (href: string) => {
    const [p, q] = href.split("?");
    const v = new URLSearchParams(q ?? "").get("view");
    return path === p && (v ?? null) === (view ?? null);
  };
  return (
    <>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={current(i.href) ? "page" : undefined}>
          {i.label}
          {!!i.count && <span className="nav-count" aria-label={`${i.count} waiting`}>{i.count}</span>}
        </Link>
      ))}
    </>
  );
}
