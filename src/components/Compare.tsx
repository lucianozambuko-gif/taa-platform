"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "taa-compare";
const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const write = (v: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event("taa-compare"));
};

function useCompare() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener("taa-compare", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("taa-compare", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

/** "Compare" tick on a course card (up to 3 courses). */
export function CompareToggle({ slug, title }: { slug: string; title: string }) {
  const list = useCompare();
  const on = list.includes(slug);
  const full = !on && list.length >= 3;
  return (
    <label className={`cmp ${on ? "on" : ""}`} title={full ? "You can compare up to 3 courses" : "Compare this course"}>
      <input
        type="checkbox"
        checked={on}
        disabled={full}
        onChange={() => write(on ? list.filter((s) => s !== slug) : [...list, slug])}
        aria-label={`Compare ${title}`}
      />
      Compare
    </label>
  );
}

/** Sticky bar that appears once 2 or more courses are ticked. */
export function CompareBar() {
  const list = useCompare();
  if (list.length < 2) return list.length === 1 ? <div className="cmp-bar"><span className="small">Tick one more course to compare</span><button className="btn btn-ghost btn-sm" onClick={() => write([])}>Clear</button></div> : null;
  return (
    <div className="cmp-bar">
      <span className="small"><b>{list.length}</b> courses ticked</span>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => write([])}>Clear</button>
        <Link className="btn btn-primary btn-sm" href={`/compare?c=${list.join(",")}`}>Compare side by side</Link>
      </div>
    </div>
  );
}
