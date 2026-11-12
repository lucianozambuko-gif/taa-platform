import Link from "next/link";
import { KindBadge, PriceBlock } from "@/components/CourseBits";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABEL, rand } from "@/lib/format";
import type { Course } from "@/lib/types";

export const metadata = { title: "Compare courses", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Up to three courses side by side: price, duration, NQF level, practical requirements and more. */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const slugs = ((await searchParams).c ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const supabase = await createClient();
  const { data } = slugs.length ? await supabase.from("courses").select("*").in("slug", slugs).eq("published", true) : { data: [] };
  const courses = slugs.map((s) => (data ?? []).find((c) => c.slug === s)).filter(Boolean) as Course[];
  const nqf = (c: Course) => (c.accreditation_approved && c.nqf_level ? `NQF ${c.nqf_level}` : c.kind === "short" ? "Not on the NQF" : "To be confirmed");
  const rows: [string, (c: Course) => React.ReactNode, ((c: Course) => string)?][] = [
    ["Type", (c) => KIND_LABEL[c.kind]],
    ["Price", (c) => <><PriceBlock course={c} />{c.instalments && c.instalments > 1 ? <div className="small muted">or {c.instalments} instalments of about {rand(Math.ceil((c.price_cents ?? 0) / c.instalments))}</div> : null}</>, (c) => `${c.price_cents ?? "quote"}-${c.instalments ?? 1}`],
    ["Duration", (c) => c.duration],
    ["Delivery", (c) => c.format_note ?? c.format],
    ["Location", (c) => c.location],
    ["NQF level", nqf],
    ["Credits", (c) => (c.accreditation_approved && c.credits ? c.credits : "—")],
    ["Practical requirements", (c) => c.practical ?? "None"],
    ["Entry requirements", (c) => c.entry_requirements],
    ["Assessment", (c) => c.assessment],
    ["Certificate", (c) => c.certificate],
    ["Next intake", (c) => c.intakes[0] ?? "On request"],
    ["Online lessons", (c) => (c.has_lms ? "Yes, start straight away" : "No, classroom or workplace")],
  ];
  const raw = (f: (c: Course) => React.ReactNode, r: ((c: Course) => string) | undefined, c: Course) => (r ? r(c) : String(f(c) ?? ""));
  const priced = courses.filter((c) => c.price_cents);
  const cheapest = priced.length > 1 ? priced.reduce((a, b) => ((a.price_cents ?? 0) <= (b.price_cents ?? 0) ? a : b)).id : null;
  const LETTERS = ["A", "B", "C"];
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <div className="crumbs"><Link href="/courses">Courses</Link><span>/</span><span>Compare</span></div>
        <h1 style={{ fontSize: "clamp(1.7rem,3.6vw,2.4rem)" }}>Compare courses</h1>
        {courses.length < 2 ? (
          <div className="panel stack">
            <p>Tick “Compare” on two or three courses in the catalogue, then come back here.</p>
            <div><Link className="btn btn-primary" href="/courses">Go to the catalogue</Link></div>
          </div>
        ) : (
          <>
          <div className="panel tscroll cmp-desk" tabIndex={0} style={{ padding: "6px 10px" }}>
            <table className="tbl cmp-table">
              <thead>
                <tr>
                  <th></th>
                  {courses.map((c) => (
                    <th key={c.id} style={{ minWidth: 200 }}>
                      <KindBadge course={c} />
                      <div style={{ marginTop: 6, fontSize: "1rem", color: "var(--ink)", textTransform: "none", letterSpacing: 0 }}>{c.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, f]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {courses.map((c) => <td key={c.id}>{f(c)}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row"></th>
                  {courses.map((c) => <td key={c.id}><Link className="btn btn-primary btn-sm" href={`/courses/${c.slug}`}>View course</Link></td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Phones: course names stay pinned; each detail shows the courses side by side; identical details collapse */}
          <div className={`cmp-phone n${courses.length}`}>
            <label className="cmp-diff"><input type="checkbox" /> Only show what&apos;s different</label>
            <div className="cmp-heads" role="list">
              {courses.map((c, i) => (
                <div key={c.id} className={`cmp-head c${i}`} role="listitem">
                  <span className="cmp-letter">{LETTERS[i]}</span>
                  <b>{c.title}</b>
                  <span className="cmp-price">{c.price_cents ? rand(c.price_cents) : "Quote"}</span>
                  {c.id === cheapest && <span className="cmp-tag">Best price</span>}
                  {c.has_lms && <span className="cmp-tag good">Start today</span>}
                </div>
              ))}
            </div>
            {rows.map(([label, f, r]) => {
              const vals = courses.map((c) => raw(f, r, c));
              const same = vals.every((v) => v === vals[0]);
              return (
                <div key={label} className={`cmp-row ${same ? "same" : "diff"}`}>
                  <div className="cmp-label">{label}{!same && <span className="cmp-dot" aria-label="differs" />}</div>
                  {same ? (
                    <div className="cmp-same"><span className="small muted">Same for all:</span> {f(courses[0])}</div>
                  ) : (
                    <div className="cmp-vals">
                      {courses.map((c, i) => <div key={c.id} className={`cmp-val c${i}`}><span className="cmp-letter sm">{LETTERS[i]}</span><div>{f(c)}</div></div>)}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="cmp-vals cmp-actions">
              {courses.map((c, i) => <Link key={c.id} className="btn btn-primary btn-sm" href={`/courses/${c.slug}`}>View {LETTERS[i]}</Link>)}
            </div>
          </div>
          </>
        )}
      </div>
    </section>
  );
}
