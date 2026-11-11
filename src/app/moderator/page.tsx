import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, getUserAndProfile } from "@/lib/supabase/server";
import { QuickLinks, Tile, TodoList, WorkHead, today, type Todo } from "@/components/WorkBits";
import { homeFor } from "@/lib/roles";

export const metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—");
type Row = {
  id: string; user_id: string; course_id: string; result: string; assessed_by: string | null; assessed_at: string | null;
  poe_submitted_at: string | null; moderation: string | null; moderation_note: string | null; moderated_at: string | null;
  courses: { title: string; code: string; slug: string };
};

/** Moderator's queue: assessed results waiting for moderation, with a suggested sample, and the verification pack export. */
export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ course?: string; view?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/moderator");
  const role = profile?.role ?? "learner";
  if (role !== "moderator" && role !== "admin") redirect(homeFor(role));
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

  const view = sp.view === "queue" || sp.view === "history" ? sp.view : "overview";
  const exportHref = `/moderator/export${sp.course ? `?course=${sp.course}` : ""}`;
  const filter = (
    <form className="panel row" style={{ gap: 10, alignItems: "end" }} action="/moderator">
      <input type="hidden" name="view" value={view} />
      <div className="field" style={{ flex: "1 1 260px" }}>
        <label htmlFor="m-course">Programme</label>
        <select id="m-course" name="course" defaultValue={sp.course ?? ""}>
          <option value="">All programmes</option>
          {courses.map(([id, c]) => <option key={id} value={id}>{c.title}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-sm">Show</button>
    </form>
  );
  const queue = (list: Row[]) => (
    <div className="tscroll" tabIndex={0}>
      <table className="tbl">
        <thead><tr><th>Learner</th><th>Programme</th><th>Assessor</th><th>Result</th><th>Evidence</th><th></th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td><b>{name(r.user_id)}</b>{inSample.has(r.id) && <><br /><span className="badge b-acc">In sample</span></>}</td>
              <td className="small">{r.courses.title}<br /><span className="muted">{r.courses.code}</span></td>
              <td className="small">{name(r.assessed_by)}<br /><span className="muted">{day(r.assessed_at)}</span></td>
              <td><span className={`badge ${r.result === "competent" ? "b-good" : "b-warn"}`}>{r.result === "competent" ? "Competent" : "Not yet competent"}</span></td>
              <td className="small">{evCount(r.id)} files<br /><span className="muted">{r.poe_submitted_at ? "learner signed" : "not signed"}</span></td>
              <td><Link className="btn btn-primary btn-sm" href={`/poe/${r.id}`}>Open portfolio</Link></td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={6} className="muted">Nothing waiting. New results appear here as soon as an assessor records them.</td></tr>}
        </tbody>
      </table>
    </div>
  );
  const history = (list: Row[]) => (
    <>
      {list.map((r) => (
        <Link key={r.id} href={`/poe/${r.id}`} className="row" style={{ justifyContent: "space-between", textDecoration: "none", color: "inherit", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
          <span><b>{name(r.user_id)}</b> · <span className="small">{r.courses.title}</span>{r.moderation_note && <><br /><span className="small muted">“{r.moderation_note}”</span></>}</span>
          <span className={`badge ${r.moderation === "endorsed" ? "b-good" : "b-warn"}`}>{r.moderation === "endorsed" ? "Endorsed" : "Referred back"} · {day(r.moderated_at)}</span>
        </Link>
      ))}
      {!list.length && <p className="small muted">No moderated results yet.</p>}
    </>
  );

  if (view === "queue")
    return (
      <>
        <WorkHead eyebrow="Moderation workspace" title="Portfolios to moderate">
          <a className="btn btn-ghost btn-sm" href={exportHref}>Download verification pack (CSV)</a>
        </WorkHead>
        {filter}
        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">Waiting for you <span className="badge b-warn tnum">{pending.length}</span></h2>
          <p className="small muted">The suggested sample covers every “not yet competent” decision and at least one in four competent decisions per assessor. You can moderate any portfolio; results outside the sample can be endorsed after a lighter check.</p>
          {queue(pending)}
        </div>
      </>
    );

  if (view === "history")
    return (
      <>
        <WorkHead eyebrow="Moderation workspace" title="Moderated results">
          <a className="btn btn-ghost btn-sm" href={exportHref}>Download verification pack (CSV)</a>
        </WorkHead>
        {filter}
        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">{done.length} decisions</h2>
          {history(done)}
        </div>
      </>
    );

  const oldest = [...pending].sort((a, b) => (a.assessed_at ?? "").localeCompare(b.assessed_at ?? ""))[0];
  const waitDays = oldest?.assessed_at ? Math.floor((Date.now() - new Date(oldest.assessed_at).getTime()) / 864e5) : 0;
  const todos: Todo[] = [];
  if (inSample.size) todos.push({ key: "sample", n: inSample.size, title: `${inSample.size === 1 ? "portfolio is" : "portfolios are"} in the suggested sample`, detail: "Every “not yet competent” decision and one in four competent decisions per assessor", href: "/moderator?view=queue", cta: "Moderate" });
  if (pending.length - inSample.size > 0) todos.push({ key: "rest", n: pending.length - inSample.size, title: "more results can be endorsed after a lighter check", href: "/moderator?view=queue", cta: "Open" });
  if (oldest && waitDays >= 3) todos.push({ key: "old", tone: "bad", n: waitDays, title: `days since the oldest result was assessed`, detail: `${name(oldest.user_id)} · ${oldest.courses.title}`, href: `/poe/${oldest.id}`, cta: "Open portfolio" });
  if (referred.length) todos.push({ key: "ref", n: referred.length, title: `${referred.length === 1 ? "result is" : "results are"} still with the assessor after you referred ${referred.length === 1 ? "it" : "them"} back`, href: "/moderator?view=history", cta: "See" });

  return (
    <>
      <WorkHead eyebrow={today()} title={`Good day, ${(profile?.full_name ?? "").split(" ")[0] || "there"}`}>
        <a className="btn btn-ghost btn-sm" href={exportHref}>Verification pack (CSV)</a>
      </WorkHead>
      <div className="stat-tiles">
        <Tile href="/moderator?view=queue" value={pending.length} label="awaiting moderation" warn={pending.length > 0} />
        <Tile href="/moderator?view=queue" value={inSample.size} label="in the suggested sample" />
        <Tile href="/moderator?view=history" value={rows.filter((r) => r.moderation === "endorsed").length} label="endorsed" />
        <Tile href="/moderator?view=history" value={referred.length} label="referred back" />
      </div>
      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <TodoList todos={todos} empty="Nothing is waiting. New results appear here as soon as an assessor records them." />
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h3">Next in the queue</h2>
              <Link className="small" href="/moderator?view=queue">Whole queue →</Link>
            </div>
            {queue([...pending].sort((a, b) => Number(inSample.has(b.id)) - Number(inSample.has(a.id))).slice(0, 5))}
          </div>
        </div>
        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">Recently moderated</div>
            {history(done.slice(0, 5))}
            <Link className="btn btn-ghost btn-sm" href="/moderator?view=history">All decisions</Link>
          </div>
          <QuickLinks links={[["/admin/guide", "Moderator guide"], ["/account", "My profile"]]} />
          <p className="small muted">{rows.length} assessed results across {courses.length} {courses.length === 1 ? "programme" : "programmes"}.</p>
        </aside>
      </div>
    </>
  );
}
