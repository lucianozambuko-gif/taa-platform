import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { createSession, saveAttendance } from "../actions";

export const metadata = { title: "Attendance register" };
export const dynamic = "force-dynamic";

const day = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });

/** Phone-friendly register for classroom and practical days. */
export default async function Attendance({ searchParams }: { searchParams: Promise<{ course?: string; session?: string }> }) {
  const { course: slug, session } = await searchParams;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/facilitator");
  if (!["facilitator", "admin"].includes(profile?.role ?? "")) redirect("/");
  if (!slug) return <CoursePicker userId={user.id} isAdmin={profile?.role === "admin"} />;
  const { data: course } = await supabase.from("courses").select("id, title, slug, location").eq("slug", slug).maybeSingle();
  if (!course) redirect("/facilitator/attendance");
  const [{ data: sessions }, { data: enrols }] = await Promise.all([
    supabase.from("class_sessions").select("id, date, title, location").eq("course_id", course.id).order("date", { ascending: false }),
    supabase.from("enrolments").select("user_id").eq("course_id", course.id),
  ]);
  const ids = (enrols ?? []).map((e) => e.user_id);
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids).order("full_name") : { data: [] };
  const active = (sessions ?? []).find((s) => s.id === session) ?? (sessions ?? [])[0];
  const { data: marks } = active ? await supabase.from("attendance").select("user_id, present").eq("session_id", active.id) : { data: [] };
  const mark = new Map((marks ?? []).map((m) => [m.user_id, m.present]));
  const { data: allMarks } = (sessions ?? []).length ? await supabase.from("attendance").select("session_id, user_id, present").in("session_id", (sessions ?? []).map((s) => s.id)) : { data: [] };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 16, maxWidth: 820 }}>
        <div className="crumbs"><Link href="/facilitator/attendance">Attendance</Link><span>/</span><span>{course.title}</span></div>
        <h1 style={{ fontSize: "clamp(1.6rem,3.4vw,2.2rem)" }}>Attendance register</h1>

        <form action={createSession} className="panel row" style={{ gap: 8, alignItems: "end" }}>
          <input type="hidden" name="course_id" value={course.id} />
          <input type="hidden" name="slug" value={course.slug} />
          <div className="field" style={{ flex: "0 1 160px" }}><label>Date</label><input name="date" type="date" defaultValue={today} required /></div>
          <div className="field" style={{ flex: "1 1 200px" }}><label>Session</label><input name="title" placeholder="e.g. Day 1: theory" /></div>
          <div className="field" style={{ flex: "1 1 160px" }}><label>Room</label><input name="location" defaultValue={course.location} /></div>
          <button className="btn btn-primary btn-sm">Start register</button>
        </form>

        {(sessions ?? []).length > 0 && (
          <nav className="row" style={{ gap: 6 }} aria-label="Sessions">
            {(sessions ?? []).map((s) => (
              <Link key={s.id} className={`btn btn-sm ${s.id === active?.id ? "btn-primary" : "btn-ghost"}`} href={`/facilitator/attendance?course=${course.slug}&session=${s.id}`}>
                {day(s.date)} · {(allMarks ?? []).filter((m) => m.session_id === s.id && m.present).length}/{ids.length}
              </Link>
            ))}
          </nav>
        )}

        {active ? (
          <form action={saveAttendance} className="panel stack" style={{ gap: 8 }}>
            <input type="hidden" name="session_id" value={active.id} />
            <h3>{active.title} · {day(active.date)}{active.location ? ` · ${active.location}` : ""}</h3>
            <p className="small muted">Tick everyone who is present, then save. You can change it later.</p>
            {(people ?? []).map((p) => (
              <label key={p.id} className="plan-opt" style={{ alignItems: "center" }}>
                <input type="hidden" name="learner" value={p.id} />
                <input type="checkbox" name="present" value={p.id} defaultChecked={mark.get(p.id) ?? false} style={{ width: 22, height: 22 }} />
                <span style={{ flex: 1 }}><b>{p.full_name ?? "Learner"}</b></span>
                {mark.has(p.id) && <span className={`badge ${mark.get(p.id) ? "b-good" : "b-warn"}`}>{mark.get(p.id) ? "Present" : "Absent"}</span>}
              </label>
            ))}
            {!(people ?? []).length && <p className="muted">No learners enrolled on this course yet.</p>}
            <div><button className="btn btn-primary">Save register</button></div>
          </form>
        ) : (
          <p className="muted">No class days yet. Start a register above.</p>
        )}
      </div>
    </section>
  );
}

/** No course chosen yet: pick one of the courses you teach. */
async function CoursePicker({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { supabase } = await getUserAndProfile();
  const { loadTeaching } = await import("@/lib/teaching");
  const { courses, rows } = await loadTeaching(supabase, userId, isAdmin);
  const { data: sessions } = courses.length
    ? await supabase.from("class_sessions").select("course_id, date").in("course_id", courses.map((c) => c.id)).order("date", { ascending: false })
    : { data: [] };
  const ordered = [...courses].sort((a, b) => Number(a.has_lms && a.format === "Online") - Number(b.has_lms && b.format === "Online"));
  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap stack" style={{ gap: 16, maxWidth: 820 }}>
        <div>
          <div className="eyebrow">Attendance</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.5rem)", marginTop: 6 }}>Which class are you taking?</h1>
          <p className="muted" style={{ marginTop: 6 }}>Choose the course, then start today’s register.</p>
        </div>
        {ordered.map((c) => {
          const days = (sessions ?? []).filter((s) => s.course_id === c.id);
          return (
            <Link key={c.id} href={`/facilitator/attendance?course=${c.slug}`} className="panel row" style={{ justifyContent: "space-between", gap: 10, textDecoration: "none", color: "inherit" }}>
              <span><b>{c.title}</b><br /><span className="small muted">{rows.filter((r) => r.course_id === c.id).length} learner{rows.filter((r) => r.course_id === c.id).length === 1 ? "" : "s"} · {c.format}{days.length ? ` · last register ${day(days[0].date)}` : " · no registers yet"}</span></span>
              <span className="btn btn-primary btn-sm">Open register</span>
            </Link>
          );
        })}
        {!courses.length && <div className="panel"><p className="muted">No courses assigned to you yet. Ask an admin to assign you under Users.</p></div>}
      </div>
    </section>
  );
}
