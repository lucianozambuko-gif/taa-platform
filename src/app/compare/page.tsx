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
  const rows: [string, (c: Course) => React.ReactNode][] = [
    ["Type", (c) => KIND_LABEL[c.kind]],
    ["Price", (c) => <><PriceBlock course={c} />{c.instalments && c.instalments > 1 ? <div className="small muted">or {c.instalments} instalments of about {rand(Math.ceil((c.price_cents ?? 0) / c.instalments))}</div> : null}</>],
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
          <div className="panel tscroll" style={{ padding: "6px 10px" }}>
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
        )}
      </div>
    </section>
  );
}
