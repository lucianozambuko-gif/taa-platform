"use client";

import Link from "next/link";
import { useState } from "react";

type C = { slug: string; title: string; price_cents: number | null; price_basis: string };

/** Indicative group discounts; the formal quotation confirms the final price. */
export const TIERS = [
  { min: 50, pct: 15 },
  { min: 20, pct: 10 },
  { min: 10, pct: 5 },
];
const discountFor = (n: number) => TIERS.find((t) => n >= t.min)?.pct ?? 0;
const r = (cents: number) => "R" + Math.round(cents / 100).toLocaleString("en-US");

export default function QuoteEstimator({ courses, initial }: { courses: C[]; initial?: string }) {
  const priced = courses.filter((c) => c.price_basis === "fixed" && c.price_cents);
  const [slug, setSlug] = useState(priced.find((c) => c.slug === initial)?.slug ?? priced[0]?.slug ?? "");
  const [staff, setStaff] = useState(12);
  const [onsite, setOnsite] = useState(true);
  const course = priced.find((c) => c.slug === slug);
  const n = Math.max(1, Math.min(500, staff || 1));
  const list = (course?.price_cents ?? 0) * n;
  const pct = discountFor(n);
  const total = Math.round(list * (1 - pct / 100));
  return (
    <div className="panel stack" style={{ gap: 12 }} id="estimate">
      <h2 style={{ fontSize: "1.35rem" }}>Instant estimate</h2>
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="est-course">Course</label>
          <select id="est-course" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {priced.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="est-staff">Number of staff</label>
          <input id="est-staff" type="number" min={1} max={500} value={staff} onChange={(e) => setStaff(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="est-where">Where</label>
          <select id="est-where" value={onsite ? "onsite" : "centre"} onChange={(e) => setOnsite(e.target.value === "onsite")}>
            <option value="onsite">On-site at our premises</option>
            <option value="centre">At the Academy, Johannesburg</option>
          </select>
        </div>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="sumrow tnum"><span>{n} × {r(course?.price_cents ?? 0)}</span><span>{r(list)}</span></div>
        {pct > 0 && <div className="sumrow tnum" style={{ color: "var(--good)" }}><span>Group discount ({pct}%)</span><span>−{r(list - total)}</span></div>}
        <div className="sumrow total tnum"><span>Estimated total</span><span>{r(total)}</span></div>
        <div className="small muted">About {r(total / n)} per person, VAT included.{onsite ? " On-site travel outside Gauteng is quoted separately." : ""}</div>
      </div>
      <p className="small muted">Group discounts: 5% from 10 staff, 10% from 20, 15% from 50. This is an estimate; your formal quotation confirms the price and dates.</p>
      <div>
        <Link className="btn btn-primary" href={`/employers?course=${slug}&staff=${n}&est=${Math.round(total / 100)}&where=${onsite ? "onsite" : "centre"}#quote`}>Send this as a quote request</Link>
      </div>
    </div>
  );
}
