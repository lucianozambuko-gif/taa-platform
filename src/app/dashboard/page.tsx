import Link from "next/link";
import { redirect } from "next/navigation";
import { KindBadge } from "@/components/CourseBits";
import { rand } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";
import { isBackOffice } from "@/lib/roles";
import type { Course } from "@/lib/types";

export const metadata = { title: "My learning" };
export const dynamic = "force-dynamic";

function Ring({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-label={`${pct}% complete`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--sunk)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{pct}%</text>
    </svg>
  );
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/dashboard");
  if (profile?.role === "facilitator") redirect("/facilitator");
  if (isBackOffice(profile?.role)) redirect("/admin");

  const { data: enrolments } = await supabase
    .from("enrolments")
    .select("id, created_at, result, result_note, courses(*, modules(position, lessons(id, title, position, minutes)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const { data: progress } = await supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", user.id);
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const { data: orderRows } = await supabase
    .from("orders")
    .select("id, invoice_no, status, amount_cents, courses(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const orders = orderRows ?? [];

  type L = { id: string; title: string; position: number; minutes: number };
  type Row = { id: string; created_at: string; result: string | null; result_note: string | null; courses: Course & { modules: { position: number; lessons: L[] }[] } };
  const lastTouched = new Map((progress ?? []).map((p) => [p.lesson_id, p.completed_at as string]));
  const rows = ((enrolments ?? []) as unknown as Row[]).map((e) => {
    const ordered = [...e.courses.modules]
      .sort((a, b) => a.position - b.position)
      .flatMap((m) => [...m.lessons].sort((a, b) => a.position - b.position));
    const ids = ordered.map((l) => l.id);
    const pct = ids.length ? Math.round((ids.filter((id) => done.has(id)).length / ids.length) * 100) : 0;
    const next = ordered.find((l) => !done.has(l.id));
    const minutesLeft = ordered.filter((l) => !done.has(l.id)).reduce((a, l) => a + l.minutes, 0);
    const last = ids.map((id) => lastTouched.get(id) ?? "").sort().at(-1) || e.created_at;
    return { ...e, pct, next, minutesLeft, last };
  });
  // The course to continue: online, not finished, most recently worked on.
  const current = rows.filter((r) => r.courses.has_lms && r.pct < 100).sort((a, b) => b.last.localeCompare(a.last))[0];

  const enrolledIds = rows.map((r) => r.courses.id);
  const subjects = [...new Set(rows.map((r) => r.courses.subject))];
  const { data: recs } = subjects.length
    ? await supabase.from("courses").select("*").eq("published", true).in("subject", subjects).limit(6)
    : await supabase.from("courses").select("*").eq("published", true).eq("featured", true).limit(3);
  const recommendations = ((recs ?? []) as Course[]).filter((c) => !enrolledIds.includes(c.id)).slice(0, 3);
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">My learning</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Welcome back, {firstName}</h1>
          </div>
        </div>
        <div className="dash">
          <div className="stack" style={{ gap: 14, minWidth: 0 }}>
            {current && current.next && (
              <div className="continue">
                <Ring pct={current.pct} />
                <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <span className="eyebrow">Continue where you left off</span>
                  <h2>{current.courses.title}</h2>
                  <p className="small">Next: {current.next.title} · about {current.minutesLeft} min left in the course</p>
                </div>
                <Link className="btn" href={`/learn/${current.courses.slug}/${current.next.id}`}>{current.pct > 0 ? "Resume" : "Start"}</Link>
              </div>
            )}
            {rows.length === 0 && (
              <div className="panel stack">
                <h3>You haven't enrolled in a course yet</h3>
                <p className="muted">Browse the catalogue, pay online and your course appears here straight away.</p>
                <div><Link className="btn btn-primary" href="/courses">Find a course</Link></div>
              </div>
            )}
            {rows.map((r) => (
              <div className="card enrol" key={r.id}>
                <Ring pct={r.courses.has_lms ? r.pct : 0} />
                <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}><KindBadge course={r.courses} /></div>
                  <h3>{r.courses.title}</h3>
                  <p className="small muted">
                    {r.courses.has_lms ? (r.pct === 100 ? (r.courses.certificate_auto ? "Complete. Your certificate is ready." : "Complete.") : `${r.pct}% complete`) : `Classroom programme · ${r.courses.intakes[0] ?? ""}`}
                  </p>
                  {!r.courses.certificate_auto && (
                    <p className="small">
                      {r.result === "competent" ? <span className="badge b-good">Assessed: competent</span> : r.result === "not_yet_competent" ? <span className="badge b-warn">Assessed: not yet competent</span> : <span className="badge b-short">Assessment result pending</span>}
                      {r.result_note && <span className="muted"> · {r.result_note}</span>}
                    </p>
                  )}
                </div>
                {r.courses.has_lms ? (
                  <Link className="btn btn-primary btn-sm" href={`/learn/${r.courses.slug}`}>{r.pct > 0 ? "Resume" : "Start"}</Link>
                ) : (
                  <Link className="btn btn-ghost btn-sm" href={`/courses/${r.courses.slug}`}>Details</Link>
                )}
              </div>
            ))}
            <div className="panel stack">
              <h3>Certificates</h3>
              {rows.filter((r) => (r.courses.has_lms && r.pct === 100 && r.courses.certificate_auto) || r.result === "competent").map((r) => (
                <div className="row" style={{ justifyContent: "space-between" }} key={r.id}>
                  <span>{r.courses.title}</span>
                  <Link className="btn btn-primary btn-sm" href={`/certificate/${r.courses.slug}`}>Download certificate</Link>
                </div>
              ))}
              <p className="muted small">
                Online skills courses issue a certificate automatically when every lesson is complete. Accredited results are issued by the Academy after assessment.
              </p>
            </div>
            {orders.length > 0 && (
              <div className="panel stack">
                <h3>Payments and receipts</h3>
                {orders.map((o) => (
                  <div className="row" style={{ justifyContent: "space-between" }} key={o.id}>
                    <span><span className="mono small">{o.invoice_no}</span> · {(o.courses as unknown as { title: string }).title}</span>
                    <span className="row" style={{ gap: 10 }}>
                      <span className={`badge ${o.status === "paid" ? "b-good" : "b-warn"}`}>{o.status}</span>
                      <Link className="small" href={`/orders/${o.id}`}>Receipt</Link>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="stack" style={{ gap: 14 }}>
            <div className="panel stack">
              <div className="eyebrow">Recommended next</div>
              {recommendations.map((c) => (
                <Link key={c.id} className="lbtn" href={`/courses/${c.slug}`} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", borderRadius: 0 }}>
                  <span><b>{c.title}</b><br /><span className="small muted">{c.format} · {rand(c.price_cents)}</span></span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
