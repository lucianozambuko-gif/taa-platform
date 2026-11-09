import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { loadTeaching, needsResult, referred, type TRow } from "@/lib/teaching";
import AssessForm from "../AssessForm";

export const metadata = { title: "Results and portfolios" };
export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—");

/** Two views for facilitators: results to record now, and every learner's portfolio with its sign-off status. */
export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ view?: string; course?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator/results");
  if (!["facilitator", "admin"].includes(profile?.role ?? "")) redirect("/");
  const sp = await searchParams;
  const portfolios = sp.view === "portfolios";
  const { courses, rows } = await loadTeaching(supabase, user.id, profile?.role === "admin");
  const assessed = courses.filter((c) => !(c.certificate_auto && c.has_lms));

  const tabs = (
    <nav className="row" style={{ gap: 6 }} aria-label="Views">
      <Link className={`btn btn-sm ${portfolios ? "btn-ghost" : "btn-primary"}`} href="/facilitator/results">To assess ({rows.filter((r) => needsResult(r) || referred(r)).length})</Link>
      <Link className={`btn btn-sm ${portfolios ? "btn-primary" : "btn-ghost"}`} href="/facilitator/results?view=portfolios">All portfolios</Link>
    </nav>
  );

  if (!portfolios) {
    const back = rows.filter(referred);
    const todo = rows.filter(needsResult).sort((a, b) => Number(!!b.poe_submitted_at) - Number(!!a.poe_submitted_at));
    const item = (r: TRow, note?: string) => (
      <div key={r.id} className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <span><b>{r.name}</b> · <span className="muted">{r.course.title}</span></span>
          <span className="row" style={{ gap: 6 }}>
            {r.pct !== null && <span className="badge b-short">Online {r.pct}%</span>}
            <span className={`badge ${r.poe_submitted_at ? "b-good" : "b-short"}`}>{r.poe_submitted_at ? "Portfolio signed" : "Not signed yet"}</span>
            <span className="badge b-short">{r.evidence} evidence file{r.evidence === 1 ? "" : "s"}</span>
          </span>
        </div>
        {note && <p className="small" style={{ color: "var(--bad)" }}>Moderator: {note}</p>}
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <AssessForm enrolment={r.id} result={r.result} note={r.result_note} />
          <Link className="btn btn-ghost btn-sm" href={`/poe/${r.id}`}>Open portfolio</Link>
        </div>
      </div>
    );
    return (
      <section className="block" style={{ paddingTop: 32 }}>
        <div className="wrap stack" style={{ gap: 18, maxWidth: 1000 }}>
          <div>
            <div className="eyebrow">Results</div>
            <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Results to record</h1>
            <p className="muted" style={{ marginTop: 6 }}>Learners who have finished the online part or are on a classroom programme. Check the portfolio, choose a result and save: it goes to the moderator.</p>
          </div>
          {tabs}
          {back.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              <h2 className="h3">Referred back by the moderator ({back.length})</h2>
              {back.map((r) => item(r, r.moderation_note ?? undefined))}
            </div>
          )}
          <div className="stack" style={{ gap: 10 }}>
            <h2 className="h3">Waiting for your result ({todo.length})</h2>
            {todo.map((r) => item(r))}
            {!todo.length && <div className="panel"><p className="muted">Nothing waiting. Learners appear here as soon as they finish the online part of an assessed course.</p></div>}
          </div>
        </div>
      </section>
    );
  }

  const list = rows.filter((r) => !(r.course.certificate_auto && r.course.has_lms) && (!sp.course || r.course.slug === sp.course))
    .sort((a, b) => a.course.title.localeCompare(b.course.title) || a.name.localeCompare(b.name));
  const step = (ok: boolean, label: string) => <span className={`badge ${ok ? "b-good" : "b-short"}`}>{label}</span>;
  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">Portfolios of evidence</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>All portfolios</h1>
          <p className="muted" style={{ marginTop: 6 }}>Every learner on an assessed programme, with where their portfolio is: signed by the learner, assessed by you, moderated.</p>
        </div>
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          {tabs}
          <form className="row" style={{ gap: 8 }} action="/facilitator/results">
            <input type="hidden" name="view" value="portfolios" />
            <label className="sr-only" htmlFor="p-course">Programme</label>
            <select id="p-course" name="course" defaultValue={sp.course ?? ""} style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
              <option value="">All programmes</option>
              {assessed.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm">Show</button>
          </form>
        </div>
        <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
          <table className="tbl">
            <thead><tr><th>Learner</th><th>Programme</th><th>Evidence</th><th>Progress</th><th><span className="sr-only">Portfolio</span></th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b><br /><span className="small muted">enrolled {day(r.created_at)}</span></td>
                  <td className="small">{r.course.title}</td>
                  <td className="tnum">{r.evidence}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {step(!!r.poe_submitted_at, r.poe_submitted_at ? "Signed" : "Not signed")}
                      {step(!!r.result, r.result === "competent" ? "Competent" : r.result === "not_yet_competent" ? "Not yet competent" : "Not assessed")}
                      {r.moderation === "referred" ? <span className="badge b-bad">Referred back</span> : step(r.moderation === "endorsed", r.moderation === "endorsed" ? "Moderated" : r.moderation === "pending" ? "With moderator" : "Not moderated")}
                    </div>
                  </td>
                  <td><Link className="btn btn-ghost btn-sm" href={`/poe/${r.id}`}>Open</Link></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="muted">No learners on assessed programmes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
