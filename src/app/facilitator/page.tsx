import Link from "next/link";
import { redirect } from "next/navigation";
import { QuickLinks, Tile, TodoList, WorkHead, today, type Todo } from "@/components/WorkBits";
import { homeFor } from "@/lib/roles";
import { loadTeaching, needsResult, referred } from "@/lib/teaching";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Teaching overview" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
const wa = (phone: string, text: string) => `https://wa.me/27${phone.replace(/\D/g, "").replace(/^27/, "").replace(/^0/, "")}?text=${encodeURIComponent(text)}`;

/** Where a facilitator lands: what needs marking, who has gone quiet, and the next class days. */
export default async function FacilitatorOverview({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator");
  const role = profile?.role ?? "learner";
  if (role !== "facilitator" && role !== "admin") redirect(homeFor(role));
  // Older links pointed at this address for one course's learner list.
  const { course } = await searchParams;
  if (course) redirect(`/facilitator/learners?course=${encodeURIComponent(course)}`);

  const { courses, rows } = await loadTeaching(supabase, user.id, role === "admin");
  const ids = courses.map((c) => c.id);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [{ data: sessions }, { data: proposals }] = await Promise.all([
    ids.length ? supabase.from("class_sessions").select("id, course_id, date, title").in("course_id", ids).gte("date", todayIso).order("date").limit(5) : Promise.resolve({ data: [] as { id: string; course_id: string; date: string; title: string }[] }),
    supabase.from("lesson_proposals").select("id, title, status, review_note, created_at").eq("proposed_by", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const back = rows.filter(referred);
  const waiting = rows.filter(needsResult);
  const signed = waiting.filter((r) => r.poe_submitted_at);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const quiet = rows.filter((r) => r.pct !== null && r.pct < 100 && (r.last ?? r.created_at) < weekAgo);
  const learners = new Set(rows.map((r) => r.user_id)).size;
  const pending = (proposals ?? []).filter((p) => p.status === "pending");
  const titleOf = new Map(courses.map((c) => [c.id, c]));

  const todos: Todo[] = [];
  if (back.length) todos.push({ key: "back", n: back.length, tone: "bad", title: `${back.length === 1 ? "result was" : "results were"} referred back by the moderator`, detail: back.slice(0, 3).map((r) => r.name).join(", "), href: "/facilitator/results", cta: "Fix" });
  if (signed.length) todos.push({ key: "signed", n: signed.length, title: `${signed.length === 1 ? "learner has" : "learners have"} signed their portfolio and need a result`, detail: signed.slice(0, 3).map((r) => r.name).join(", "), href: "/facilitator/results", cta: "Assess" });
  if (waiting.length - signed.length > 0) todos.push({ key: "wait", n: waiting.length - signed.length, title: signed.length ? "more results to record" : waiting.length === 1 ? "result to record" : "results to record", detail: "Classroom programmes, or the online part is finished", href: "/facilitator/results", cta: "Open" });
  for (const s of (sessions ?? []).filter((s) => s.date === todayIso)) todos.push({ key: `s-${s.id}`, title: `Today's class: ${s.title}`, detail: titleOf.get(s.course_id)?.title, href: `/facilitator/attendance?course=${titleOf.get(s.course_id)?.slug}&session=${s.id}`, cta: "Take register" });
  if (quiet.length) todos.push({ key: "quiet", n: quiet.length, title: `${quiet.length === 1 ? "learner has" : "learners have"} not opened a lesson for 7+ days`, detail: "A short WhatsApp usually gets them going again", href: "#quiet", cta: "See who" });

  return (
    <>
      <WorkHead eyebrow={today()} title={`Good day, ${(profile?.full_name ?? "").split(" ")[0] || "there"}`}>
        <Link className="btn btn-primary btn-sm" href="/facilitator/attendance">Take attendance</Link>
      </WorkHead>

      <div className="stat-tiles">
        <Tile href="/facilitator/results" value={waiting.length + back.length} label="results to record" warn={waiting.length + back.length > 0} />
        <Tile href="/facilitator/learners" value={learners} label={learners === 1 ? "learner" : "learners"} />
        <Tile href="/facilitator/learners" value={courses.length} label={role === "admin" ? "courses (all)" : courses.length === 1 ? "course assigned to you" : "courses assigned to you"} />
        <Tile href="/facilitator/lessons" value={pending.length} label="suggestions awaiting approval" />
      </div>

      {!courses.length && (
        <div className="panel stack">
          <h2 className="h3">No courses assigned yet</h2>
          <p className="muted">An administrator assigns facilitators to courses under Users &amp; roles. Your learners appear here as soon as that is done.</p>
        </div>
      )}

      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <TodoList todos={todos} empty="Nothing is waiting for you. New results to record and moderator feedback appear here." />

          <div className="panel stack" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h3">My courses</h2>
              <Link className="small" href="/facilitator/learners">All learners →</Link>
            </div>
            {courses.map((c) => {
              const mine = rows.filter((r) => r.course_id === c.id);
              const due = mine.filter((r) => needsResult(r) || referred(r)).length;
              return (
                <Link key={c.id} href={`/facilitator/learners?course=${c.slug}`} className="mini-course" style={{ gridTemplateColumns: "1fr auto" }}>
                  <span style={{ minWidth: 0 }}><b>{c.title}</b><br /><span className="small muted">{mine.length} {mine.length === 1 ? "learner" : "learners"} · {c.has_lms ? "online lessons" : "classroom"}</span></span>
                  {due > 0 ? <span className="badge b-warn">{due} to assess</span> : <span className="badge b-good">Up to date</span>}
                </Link>
              );
            })}
            {!courses.length && <p className="small muted">No courses yet.</p>}
          </div>

          {quiet.length > 0 && (
            <div className="panel stack" style={{ gap: 4 }} id="quiet">
              <h2 className="h3">Learners who have gone quiet</h2>
              {quiet.slice(0, 6).map((r) => (
                <div className="todo" key={r.id}>
                  <span style={{ minWidth: 0 }}><b>{r.name}</b><br /><span className="small muted">{r.course.title} · {r.pct}% · last active {day(r.last ?? r.created_at)}</span></span>
                  {r.phone && <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener" href={wa(r.phone, `Hi ${r.name.split(" ")[0]}, this is your facilitator at Training Africa Academy. Just checking in on ${r.course.title}. Can I help with anything?`)}>WhatsApp</a>}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">Next class days</div>
            {(sessions ?? []).map((s) => (
              <Link key={s.id} className="lbtn" href={`/facilitator/attendance?course=${titleOf.get(s.course_id)?.slug}&session=${s.id}`} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", borderRadius: 0 }}>
                <span><b>{day(`${s.date}T12:00:00`)} · {s.title}</b><br /><span className="small muted">{titleOf.get(s.course_id)?.title}</span></span>
              </Link>
            ))}
            {!(sessions ?? []).length && <p className="small muted" style={{ margin: 0 }}>No class days planned. Add one from the attendance register.</p>}
            <Link className="btn btn-ghost btn-sm" href="/facilitator/attendance">Attendance register</Link>
          </div>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">My lesson suggestions</div>
            {(proposals ?? []).map((p) => (
              <div key={p.id} className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 8 }}>
                <span className="small" style={{ minWidth: 0 }}>{p.title}</span>
                <span className={`badge ${p.status === "approved" ? "b-good" : p.status === "pending" ? "b-warn" : "b-short"}`}>{p.status === "approved" ? "Approved" : p.status === "pending" ? "With editor" : p.status === "rejected" ? "Not approved" : p.status}</span>
              </div>
            ))}
            {!(proposals ?? []).length && <p className="small muted" style={{ margin: 0 }}>Suggest a new lesson or quiz and the content editor approves it.</p>}
            <Link className="btn btn-ghost btn-sm" href="/facilitator/lessons#new">Suggest a lesson</Link>
          </div>
          <QuickLinks links={[["/facilitator/results?view=portfolios", "All portfolios of evidence"], ["/facilitator/quizzes", "Quiz results and questions"], ["/admin/guide", "Staff guide"]]} />
        </aside>
      </div>
    </>
  );
}
