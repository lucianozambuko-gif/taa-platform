"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { WorkGroup, WorkIcon, WorkItem } from "@/lib/workspace";

const ICONS: Record<WorkIcon, React.ReactNode> = {
  home: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></>,
  check: <><path d="M9 12l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="3" /></>,
  folder: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  book: <><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></>,
  quiz: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><path d="M12 17h.01" /></>,
  mail: <><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></>,
  guide: <><path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M9 12h6M9 16h6M9 8h3" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  shield: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 4v4.5H8" /><path d="M12 7.5V12l3 2" /></>,
  download: <><path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  plus: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  inbox: <><path d="M4 13l2.5-8h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1 2.5h5l1-2.5H20" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  building: <><path d="M5 20.5V4.5h9v16" /><path d="M14 9.5h5v11" /><path d="M3.5 20.5h17" /><path d="M8 8h3M8 12h3M8 16h3" /></>,
  tag: <><path d="M3.5 12.5v-8a1 1 0 0 1 1-1h8l8 8-9 9z" /><circle cx="8" cy="8" r="1.4" /></>,
  megaphone: <><path d="M4 10v4h3l7 4V6l-7 4z" /><path d="M17.5 9a4 4 0 0 1 0 6" /><path d="M7 14l1.5 5h2.5" /></>,
  pen: <><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 4" /></>,
  news: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M7.5 9h5M7.5 12.5h9M7.5 16h9" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>,
  approve: <><path d="M4 12.5l4.5 4.5L20 6" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.5 3.5 5.3 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.3-3.5-8.5s1-6 3.5-8.5z" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8.5-8.5M16 7l2.5 2.5" /></>,
  log: <><path d="M5 5.5h14M5 10h14M5 14.5h9M5 19h6" /></>,
  chat: <><path d="M4 20l1.3-4A8 8 0 1 1 8 19z" /><path d="M9 11h.01M12 11h.01M15 11h.01" /></>,
  calc: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 7.5h7" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" /></>,
};

/** How closely a menu item matches the page being shown; the closest one is highlighted. */
function score(item: WorkItem, path: string, sp: URLSearchParams) {
  if (item.download || item.external || item.href.includes("#")) return -1;
  const [p, q] = item.href.split("?");
  const want = new URLSearchParams(q ?? "");
  if (p === "/admin" && !want.has("tab")) want.set("tab", "overview");
  const cur = (k: string) => sp.get(k) ?? (k === "tab" && path === "/admin" ? "overview" : null);
  if (path === p) {
    for (const [k, v] of want) if (cur(k) !== v) return -1;
    return 1000 + p.length * 10 + [...want].length;
  }
  const deep = [...(item.match ?? [])].filter((m) => path === m || path.startsWith(m + "/")).sort((a, b) => b.length - a.length)[0];
  return deep ? deep.length : -1;
}

/** A role's own workspace menu: a sidebar on computers, a scrolling row of tabs on phones. */
export default function WorkNav({ groups, label }: { groups: WorkGroup[]; label: string }) {
  const path = usePathname();
  const sp = useSearchParams();
  let best: WorkItem | null = null;
  let top = -1;
  for (const g of groups) for (const i of g.items) {
    const s = score(i, path, sp);
    if (s > top) { top = s; best = i; }
  }
  // On phones the menu is one scrolling row: keep the current page's tab in view.
  const ref = useRef<HTMLElement>(null);
  const key = best?.href;
  useEffect(() => {
    const nav = ref.current;
    const on = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (nav && on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.offsetLeft - nav.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
  }, [key]);
  return (
    <nav className="portal-nav work-nav" aria-label={label} ref={ref}>
      {groups.map((g, gi) => (
        <div className="work-group" key={g.title ?? gi} role="group" aria-label={g.title}>
          {g.title && <span className="work-group-title">{g.title}</span>}
          {g.items.map((i) => {
            const inner = (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i.icon]}</svg>
                <span>{i.label}</span>
                {!!i.count && <span className={`pcount${i.alert ? " alert" : ""}`} aria-label={i.alert ? `${i.count} waiting` : `${i.count}`}>{i.count}</span>}
              </>
            );
            return i.download ? (
              <a key={i.href} href={i.href}>{inner}</a>
            ) : (
              <Link key={i.href} href={i.href} aria-current={i === best ? "page" : undefined}>{inner}</Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
