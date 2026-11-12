"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Light motion for the public pages: blocks rise in as they scroll into view (staggered in rows),
 * section rules draw across, and the stats count up. Nothing is hidden unless this runs, and it is off
 * for reduced motion, data saver and inside the portals.
 */
const SELECTOR = [
  ".sec-head", ".ccard-wrap", ".gallery-link", ".stats-band > div", ".quote", ".logos > div",
  "main .panel", ".modes > div", ".path", ".route", ".specs > div", ".modlist", ".notice", ".grid > *",
].join(",");

export default function Motion() {
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const appPage = /^\/(learn|checkout|poe|certificate|orders|account|dashboard|admin|facilitator|moderator|employer|sales|content|campaigns|inbox|login|signup)(\/|$)/.test(path ?? "");
    if (reduce || appPage || html.dataset.saver === "on" || document.querySelector(".portal-grid")) return;
    html.classList.add("motion");

    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => !el.closest(".portal-grid") && !el.dataset.rv);
    // Stagger siblings that share a parent, so cards in a row arrive one after another.
    const counts = new Map<Element | null, number>();
    els.forEach((el) => {
      const n = counts.get(el.parentElement) ?? 0;
      counts.set(el.parentElement, n + 1);
      el.dataset.rv = "";
      el.style.setProperty("--d", `${Math.min(n, 5) * 80}ms`);
    });

    const countUp = (b: HTMLElement) => {
      const m = (b.textContent ?? "").match(/^(\D*)([\d,]+)(.*)$/);
      if (!m) return;
      const end = Number(m[2].replace(/,/g, ""));
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1200);
        const v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        b.textContent = `${m[1]}${v.toLocaleString("en-ZA").replace(/ /g, ",")}${m[3]}`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.dataset.rv = "in";
        const b = el.matches(".stats-band > div") ? el.querySelector<HTMLElement>("b") : null;
        if (b) countUp(b);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  return null;
}
