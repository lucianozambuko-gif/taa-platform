"use client";

import { useEffect, useState } from "react";

const KEY = "taa-side-hidden";

/**
 * Desktop: hides the workspace side menu to give the page full width, and brings it back.
 * Remembers the choice on this device. Keyboard: press [ to toggle.
 */
export default function SideToggle() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem(KEY) === "1"; } catch {}
    setHidden(saved);
    document.documentElement.classList.toggle("side-hidden", saved);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable]")) return;
      flip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flip() {
    const next = !document.documentElement.classList.contains("side-hidden");
    document.documentElement.classList.toggle("side-hidden", next);
    setHidden(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch {}
  }

  return (
    <button type="button" className="side-toggle" onClick={flip} aria-expanded={!hidden} aria-label={hidden ? "Show the menu" : "Hide the menu"} title={hidden ? "Show the menu ( [ )" : "Hide the menu ( [ )"}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" />
        {hidden ? <path d="M13 10l2 2-2 2" /> : <path d="M15 10l-2 2 2 2" />}
      </svg>
      <span>{hidden ? "Show menu" : "Hide menu"}</span>
    </button>
  );
}
