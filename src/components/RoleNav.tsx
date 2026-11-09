"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { MenuItem, MenuLink } from "@/lib/menus";

const Count = ({ n }: { n?: number }) => (n ? <span className="nav-count" aria-label={`${n} waiting`}>{n}</span> : null);

/** A staff role's menu: direct links plus small dropdown groups. Shows which page you're on. */
export default function RoleNav({ items }: { items: MenuItem[] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);
  const here = (href: string) => {
    if (href.includes("#")) return false;
    const [p, q] = href.split("?");
    if (p !== path) return false;
    const want = new URLSearchParams(q ?? "");
    const keys = ["tab", "view"];
    return keys.every((k) => (want.get(k) ?? (k === "tab" && p === "/admin" ? "overview" : null)) === (sp.get(k) ?? (k === "tab" && p === "/admin" ? "overview" : null)));
  };
  // Close any open dropdown when the page changes or you click elsewhere.
  useEffect(() => {
    ref.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  }, [path, sp]);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current?.querySelectorAll("details[open]").forEach((d) => !d.contains(e.target as Node) && d.removeAttribute("open"));
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const link = (l: MenuLink) =>
    l.download ? (
      <a key={l.href} href={l.href}>{l.label}</a>
    ) : (
      <Link key={l.href} href={l.href} aria-current={here(l.href) ? "page" : undefined} className={l.href === "/" ? "nav-site" : undefined}>
        {l.label}<Count n={l.count} />
      </Link>
    );
  return (
    <div className="role-nav" ref={ref}>
      {items.map((i) =>
        "children" in i ? (
          <details key={i.label} className={`nav-group${i.children.some((c) => here(c.href)) ? " on" : ""}`}>
            <summary>{i.label}<Count n={i.count} /><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></summary>
            <div className="nav-drop">{i.children.map(link)}</div>
          </details>
        ) : (
          link(i)
        ),
      )}
    </div>
  );
}
