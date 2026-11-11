"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Last button on the phone bar. Opens the role's full menu (the side menu, shown as a bottom sheet) so every
 * page is one tap away. On pages without a portal menu it opens the site menu instead.
 */
export default function MoreButton({ icon }: { icon: React.ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const close = () => document.documentElement.classList.remove("more-open");
  const [alert, setAlert] = useState(false);

  // Red dot on "More" when a page that isn't on the bar has something waiting.
  useEffect(() => {
    const onBar = new Set(Array.from(document.querySelectorAll<HTMLAnchorElement>(".bottom-nav a")).map((a) => a.getAttribute("href")));
    const hidden = Array.from(document.querySelectorAll<HTMLAnchorElement>(".portal-side a")).some((a) => !onBar.has(a.getAttribute("href")) && a.querySelector(".pcount.alert"));
    setAlert(hidden);
  }, [path, params]);

  useEffect(close, [path, params]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!document.documentElement.classList.contains("more-open")) return;
      if (t.closest(".portal-side a")) return close();
      if (!t.closest(".portal-side") && !t.closest(".bn-more")) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, []);

  const open = () => {
    const side = document.querySelector(".portal-side");
    if (!side) {
      document.querySelector<HTMLElement>("label[for=navtoggle]")?.click();
      return;
    }
    const on = document.documentElement.classList.toggle("more-open");
    if (on) side.scrollTop = 0;
  };

  return (
    <button type="button" className="bn-more" onClick={open} aria-label="More pages">
      <span className="bn-icon">{icon}{alert && <span className="bn-dot bn-dot-sm" aria-label="Something waiting" />}</span>
      More
    </button>
  );
}
