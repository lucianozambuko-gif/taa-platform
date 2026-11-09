import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—");
type Row = {
  id: string; user_id: string; course_id: string; result: string; assessed_by: string | null; assessed_at: string | null;
  poe_submitted_at: string | null; moderation: string | null; moderation_note: string | null; moderated_at: string | null;
  courses: { title: string; code: string; slug: string };
};

/** Moderator's queue: assessed results waiting for moderation, with a suggested sample, and the verification pack export. */
export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/moderator");
  const role = profile?.role ?? "learner";
  if (role !== "moderator" && role !== "admin")
    return (
      <section className="block"><div className="wrap" style={{ maxWidth: 620 }}><div className="panel stack">
        <h1 style={{ fontSize: "1.6rem" }}>Moderators only</h1>
        <p className="muted">This area is for the Academy's moderators. An administrator can give your account the moderator role.</p>
      </div></div></section>
    );
  const sp = await searchParams;
  const { data } = await supabase
    .from("enrolments")
    .select("id, user_id, course_id, result, assessed_by, assessed_at, poe_submitted_at, moderation, moderation_note, moderated_at, courses(title, code, slug)")
    .not("result", "is", null)
    .order("assessed_at", { ascending: false });
  const all = (data ?? []) as unknown as Row[];
  const courses = [...new Map(all.map((r) => [r.course_id, r.courses])).entries()];
  const rows = sp.course ? all.filter((r) => r.course_id === sp.course) : all;
  const ids = [...new Set(all.flatMap((r) => [r.user_id, r.assessed_by]).filter(Boolean) as string[])];
  const { data: people } = ids.length ? await createAdminClient().from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = (id: string | null) => people?.find((p) => p.id === id)?.full_name ?? "—";
  const { data: ev } = rows.length ? await supabase.from("assessment_evidence").select("enrolment_id").in("enrolment_id", rows.map((r) => r.id)) : { data: [] };
  const evCount = (id: string) => (ev ?? []).filter((x) => x.enrolment_id === id).length;

  const pending = rows.filter((r) => r.moderation === "pending");
  // Suggested sample: every "not yet competent" decision, plus at least one in four competent decisions per assessor.
  const seen = new Map<string, number>();
  const inSample = new Set<string>();
  for (const r of [...pending].sort((a, b) => (a.assessed_at ?? "").localeCompare(b.assessed_at ?? ""))) {
    if (r.result === "not_yet_competent") { inSample.add(r.id); continue; }
    const n = seen.get(r.assessed_by ?? "") ?? 0;
    if (n % 4 === 0) inSample.add(r.id);
    seen.set(r.assessed_by ?? "", n + 1);
  }
  const done = rows.filter((r) => r.moderation === "endorsed" || r.moderation === "referred").sort((a, b) => (b.moderated_at ?? "").localeCompare(a.moderated_at ?? ""));
  const referred = rows.filter((r) => r.moderation === "referred");

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 20 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Moderation</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Portfolios to moderate</h1>
          </div>
          <a className="btn btn-ghost btn-sm" href={`/moderator/export${sp.course ? `?course=${sp.course}` : ""}`}>Download verification pack (CSV)</a>
        </div>
        <div className="kpis">
          <div className="card kpi"><div className="eyebrow">Awaiting moderation</div><div className="v tnum">{pending.length}</div><div className="d">{inSample.size} in the suggested sample</div></div>
          <div className="card kpi"><div className="eyebrow">Endorsed</div><div className="v tnum">{rows.filter((r) => r.moderation === "endorsed").length}</div><div className="d">statements of results released</div></div>
          <div className="card kpi"><div className="eyebrow">Referred back</div><div className="v tnum">{referred.length}</div><div className="d">with the assessor to fix</div></div>
          <div className="card kpi"><div className="eyebrow">Assessed results</div><div className="v tnum">{rows.length}</div><div className="d">{courses.length} programmes</div></div>
        </div>
        <form className="panel row" style={{ gap: 10, alignItems: "end" }} action="/moderator">
          <div className="field" style={{ flex: "1 1 260px" }}>
            <label htmlFor="m-course">Programme</label>
            <select id="m-course" name="course" defaultValue={sp.course ?? ""}>
              <option value="">All programmes</option>
              {courses.map(([id, c]) => <option key={id} value={id}>{c.title}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm">Show</button>
        </form>

        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">Waiting for you</h2>
          <p className="small muted">The suggested sample covers every “not yet competent” decision and at least one in four competent decisions per assessor. You can moderate any portfolio; results outside the sample can be endorsed after a lighter check.</p>
          <div className="tscroll" tabIndex={0}>
            <table className="tbl">
              <thead><tr><th>Learner</th><th>Programme</th><th>Assessor</th><th>Result</th><th>Evidence</th><th></th></tr></thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td><b>{name(r.user_id)}</b>{inSample.has(r.id) && <><br /><span className="badge b-acc">In sample</span></>}</td>
                    <td className="small">{r.courses.title}<br /><span className="muted">{r.courses.code}</span></td>
                    <td className="small">{name(r.assessed_by)}<br /><span className="muted">{day(r.assessed_at)}</span></td>
                    <td><span className={`badge ${r.result === "competent" ? "b-good" : "b-warn"}`}>{r.result === "competent" ? "Competent" : "Not yet competent"}</span></td>
                    <td className="small">{evCount(r.id)} files<br /><span className="muted">{r.poe_submitted_at ? "learner signed" : "not signed"}</span></td>
                    <td><Link className="btn btn-primary btn-sm" href={`/poe/${r.id}`}>Open portfolio</Link></td>
                  </tr>
                ))}
                {!pending.length && <tr><td colSpan={6} className="muted">Nothing waiting. New results appear here as soon as an assessor records them.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {done.length > 0 && (
          <div className="panel stack" style={{ gap: 8 }}>
            <h2 className="h3">Recently moderated</h2>
            {done.slice(0, 12).map((r) => (
              <Link key={r.id} href={`/poe/${r.id}`} className="row" style={{ justifyContent: "space-between", textDecoration: "none", color: "inherit", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                <span><b>{name(r.user_id)}</b> · <span className="small">{r.courses.title}</span>{r.moderation_note && <><br /><span className="small muted">“{r.moderation_note}”</span></>}</span>
                <span className={`badge ${r.moderation === "endorsed" ? "b-good" : "b-warn"}`}>{r.moderation === "endorsed" ? "Endorsed" : "Referred back"} · {day(r.moderated_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
