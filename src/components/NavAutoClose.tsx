"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Closes the phone menu after navigating, tapping a link, tapping outside it, or pressing Escape. */
export default function NavAutoClose() {
  const path = usePathname();
  const search = useSearchParams();
  const close = () => {
    const t = document.getElementById("navtoggle") as HTMLInputElement | null;
    if (t?.checked) t.checked = false;
  };
  useEffect(close, [path, search]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest(".navlinks a, .navlinks button")) return close();
      if (!el.closest("header.site")) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
