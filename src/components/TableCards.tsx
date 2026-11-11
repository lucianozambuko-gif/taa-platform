"use client";

import { useEffect } from "react";

/**
 * On phones, data tables in the portals turn into stacked cards. This copies each column heading onto its
 * cells (data-label) so the card can show "Amount  R1,200" instead of a squashed column. The first column
 * becomes the card's title. Runs again when the page content changes.
 */
export default function TableCards() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>(".portal-main table.tbl:not(.cmp-table):not(.no-cards)").forEach((t) => {
        const heads = Array.from(t.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
        if (!heads.length) return;
        t.classList.add("stack-sm");
        t.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            if (td.tagName !== "TD" || td.hasAttribute("data-label")) return;
            td.setAttribute("data-label", i === 0 ? "" : heads[i] ?? "");
          });
        });
      });
    };
    label();
    const main = document.querySelector(".portal-main");
    if (!main) return;
    let raf = 0;
    const obs = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(label); });
    obs.observe(main, { childList: true, subtree: true });
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  });
  return null;
}
