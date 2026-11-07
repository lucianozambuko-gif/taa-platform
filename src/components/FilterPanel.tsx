"use client";

import { useEffect, useRef } from "react";

/** Filters open by default on desktop; collapsed behind a "Filter courses" bar on phones. */
export default function FilterPanel({ active, children }: { active: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 901px)").matches) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className="filters panel">
      <summary>Filter courses{active ? ` (${active} on)` : ""}</summary>
      <div className="filter-body">{children}</div>
    </details>
  );
}
