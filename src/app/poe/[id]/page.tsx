import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import AssessForm from "@/app/facilitator/AssessForm";
import { createAdminClient, getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { ModerateForm, PoeUpload, SubmitPoe } from "../PoeForms";
import { removePoeEvidence } from "../actions";

export const metadata = { title: "Portfolio of evidence" };
export const dynamic = "force-dynamic";

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");
const SECTIONS = ["Knowledge", "Practical", "Workplace", "Other"];
const RESULT: Record<string, string> = { competent: "Competent", not_yet_competent: "Not yet competent" };

type C = Course & { modules: { position: number; title: string; lessons: { id: string; title: string; kind: string; position: number }[] }[] };

/** A learner's portfolio of evidence: evidence, declaration, assessor decision and moderation, on one printable page. */
export default async function PoePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect(`/login?next=/poe/${id}`);
  const role = profile?.role ?? "learner";

  // Row-level security decides who can open this: the learner, their facilitator, a moderator, the employer or an admin.
  const { data: e } = await supabase
    .from("enrolments")
    .select("id, user_id, course_id, company, source, created_at, result, result_note, assessed_by, assessed_at, poe_submitted_at, moderation, moderation_note, moderated_by, moderated_at, courses(*, modules(position, title, lessons(id, title, kind, position)))")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const course = e.courses as unknown as C;
  const isLearner = e.user_id === user.id;
  const { data: teachRow } = await supabase.from("course_facilitators").select("course_id").eq("course_id", e.course_id).eq("user_id", user.id).maybeSingle();
  const isAssessor = role === "admin" || (role === "facilitator" && !!teachRow);
  const isModerator = role === "moderator" || role === "admin";

  const admin = createAdminClient();
  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [{ data: evidence }, { data: progress }, { data: sessions }, { data: att }, { data: people }] = await Promise.all([
    supabase.from("assessment_evidence").select("id, path, name, section, source, uploaded_by, created_at").eq("enrolment_id", id).order("created_at"),
    lessonIds.length ? supabase.from("lesson_progress").select("lesson_id, score, completed_at").eq("user_id", e.user_id).in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
    supabase.from("class_sessions").select("id, date, title").eq("course_id", e.course_id).order("date"),
    supabase.from("attendance").select("session_id, present").eq("user_id", e.user_id),
    // Names only, for the sign-off blocks (learners can't read staff profiles directly).
    admin.from("profiles").select("id, full_name, phone").in("id", [e.user_id, e.assessed_by, e.moderated_by].filter(Boolean) as string[]),
  ]);
  const name = (uid: string | null) => people?.find((p) => p.id === uid)?.full_name ?? (uid ? "Academy staff" : "—");
  const learner = people?.find((p) => p.id === e.user_id);
  let email = "";
  if (!isLearner) {
    try { email = (await admin.auth.admin.getUserById(e.user_id)).data.user?.email ?? ""; } catch {}
  }
  const files = await Promise.all(
    (evidence ?? []).map(async (f) => ({ ...f, url: (await supabase.storage.from("evidence").createSignedUrl(f.path, 60 * 30)).data?.signedUrl ?? null })),
  );
  const prog = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  const attended = (sessions ?? []).filter((s) => att?.find((a) => a.session_id === s.id)?.present);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const pct = lessons.length ? Math.round((lessons.filter((l) => prog.has(l.id)).length / lessons.length) * 100) : null;

  const canUpload = (isLearner && !e.poe_submitted_at) || (isAssessor && e.moderation !== "endorsed");
  const step = (done: boolean, label: string, when: string) => (
    <div className={`poe-step ${done ? "done" : ""}`}><span className="dot" aria-hidden="true">{done ? "✓" : ""}</span><span><b>{label}</b><br /><span className="small muted">{when}</span></span></div>
  );

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack poe" style={{ gap: 18, maxWidth: 980 }}>
        <div className="crumbs no-print">
          <Link href={isLearner ? "/dashboard" : role === "moderator" ? "/moderator?view=queue" : role === "facilitator" ? `/facilitator/learners?course=${course.slug}` : "/admin?tab=learners"}>← Back</Link>
        </div>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Portfolio of evidence</div>
            <h1 style={{ fontSize: "clamp(1.6rem,3.4vw,2.3rem)", marginTop: 6 }}>{learner?.full_name ?? "Learner"} · {course.title}</h1>
            <p className="small muted" style={{ marginTop: 6 }}>
              {course.code}{course.saqa_id ? ` · SAQA ID ${course.saqa_id}` : ""}{course.nqf_level ? ` · NQF ${course.nqf_level}` : ""}{course.credits ? ` · ${course.credits} credits` : ""}{course.accreditation_body ? ` · ${course.accreditation_body}` : ""}
            </p>
          </div>
          <div className="no-print"><PrintButton label="Print or save as PDF" /></div>
        </div>

        <div className="poe-steps">
          {step(!!e.poe_submitted_at, "Learner declaration", e.poe_submitted_at ? `Signed ${day(e.poe_submitted_at)}` : "Not submitted yet")}
          {step(!!e.result, "Assessed", e.result ? `${RESULT[e.result]} · ${day(e.assessed_at)}` : "Awaiting the assessor")}
          {step(e.moderation === "endorsed", "Moderated", e.moderation === "endorsed" ? `Endorsed ${day(e.moderated_at)}` : e.moderation === "referred" ? `Referred back ${day(e.moderated_at)}` : e.result ? "Awaiting the moderator" : "After assessment")}
        </div>

        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">A. Learner details</h2>
          <div className="poe-grid">
            <span className="muted">Learner</span><span>{learner?.full_name ?? "—"}</span>
            {!isLearner && <><span className="muted">Contact</span><span>{[email, learner?.phone].filter(Boolean).join(" · ") || "—"}</span></>}
            <span className="muted">Enrolled</span><span>{day(e.created_at)}{e.company ? ` · sponsored by ${e.company}` : ""}</span>
            <span className="muted">Programme</span><span>{course.title} ({course.code})</span>
          </div>
        </div>

        {lessons.length > 0 && (
          <div className="panel stack" style={{ gap: 8 }}>
            <h2 className="h3">B. Knowledge: online lessons and quizzes</h2>
            <p className="small muted">{pct}% of online lessons complete. Quiz scores are recorded automatically by the learning platform.</p>
            <div className="tscroll" tabIndex={0}>
              <table className="tbl">
                <thead><tr><th>Lesson</th><th>Type</th><th>Completed</th><th>Score</th></tr></thead>
                <tbody>
                  {lessons.map((l) => {
                    const p = prog.get(l.id);
                    return <tr key={l.id}><td>{l.title}</td><td className="small">{l.kind}</td><td className="small">{p ? day(p.completed_at) : "—"}</td><td className="tnum">{p?.score != null ? `${p.score}%` : "—"}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(sessions ?? []).length > 0 && (
          <div className="panel stack" style={{ gap: 8 }}>
            <h2 className="h3">C. Attendance</h2>
            <p className="small muted">Attended {attended.length} of {(sessions ?? []).length} class days ({Math.round((attended.length / (sessions ?? []).length) * 100)}%).</p>
            <div className="row" style={{ gap: 6 }}>
              {(sessions ?? []).map((s) => {
                const here = att?.find((a) => a.session_id === s.id)?.present;
                return <span key={s.id} className={`badge ${here ? "b-good" : "b-bad"}`}>{day(s.date)} · {here ? "present" : "absent"}</span>;
              })}
            </div>
          </div>
        )}

        <div className="panel stack" style={{ gap: 12 }}>
          <h2 className="h3">D. Evidence</h2>
          {SECTIONS.map((sec) => {
            const list = files.filter((f) => f.section === sec);
            if (!list.length) return null;
            return (
              <div key={sec} className="stack" style={{ gap: 6 }}>
                <span className="flabel">{sec}</span>
                {list.map((f) => (
                  <div key={f.id} className="row poe-file" style={{ justifyContent: "space-between", gap: 8 }}>
                    <span>
                      {f.url ? <a href={f.url} target="_blank" rel="noopener">{f.name}</a> : f.name}
                      <span className="small muted"> · {f.source === "learner" ? "uploaded by the learner" : `assessor: ${name(f.uploaded_by)}`} · {day(f.created_at)}</span>
                    </span>
                    {isLearner && f.source === "learner" && !e.poe_submitted_at && (
                      <form action={removePoeEvidence} className="no-print">
                        <input type="hidden" name="id" value={f.id} /><input type="hidden" name="enrolment" value={e.id} />
                        <button className="btn btn-ghost btn-sm" aria-label={`Remove ${f.name}`}>Remove</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {!files.length && <p className="small muted">No evidence yet. {isLearner ? "Add photos of your practical work, signed workplace checklists or completed workbooks." : ""}</p>}
          {canUpload && <PoeUpload courseId={e.course_id} enrolmentId={e.id} defaultSection={isLearner ? "Workplace" : "Practical"} />}
        </div>

        <div className="panel stack" style={{ gap: 10 }}>
          <h2 className="h3">E. Learner declaration of authenticity</h2>
          {e.poe_submitted_at ? (
            <p>Signed electronically by <b>{learner?.full_name ?? "the learner"}</b> on {day(e.poe_submitted_at)}: “The evidence in this portfolio is my own work, and I did the practical tasks myself.”</p>
          ) : isLearner ? (
            <SubmitPoe enrolmentId={e.id} count={files.filter((f) => f.source === "learner").length} />
          ) : (
            <p className="small muted">The learner hasn't signed and submitted the portfolio yet.</p>
          )}
        </div>

        <div className="panel stack" style={{ gap: 10 }}>
          <h2 className="h3">F. Assessor decision</h2>
          {e.result ? (
            <p><b>{RESULT[e.result]}</b> · assessed by {name(e.assessed_by)} on {day(e.assessed_at)}{e.result_note ? <><br /><span className="muted">“{e.result_note}”</span></> : null}</p>
          ) : (
            <p className="small muted">Not assessed yet.</p>
          )}
          {isAssessor && e.moderation !== "endorsed" && <div className="no-print"><AssessForm enrolment={e.id} result={e.result} note={e.result_note} /></div>}
          {isAssessor && e.moderation === "referred" && <p className="notice" role="status">The moderator referred this decision back: “{e.moderation_note}”. Fix the evidence or decision, then save the result again to send it back for moderation.</p>}
        </div>

        <div className="panel stack" style={{ gap: 10 }}>
          <h2 className="h3">G. Moderation</h2>
          {e.moderation && e.moderation !== "pending" ? (
            <p><b>{e.moderation === "endorsed" ? "Endorsed" : "Referred back to the assessor"}</b> · moderated by {name(e.moderated_by)} on {day(e.moderated_at)}{e.moderation_note ? <><br /><span className="muted">“{e.moderation_note}”</span></> : null}</p>
          ) : (
            <p className="small muted">{e.result ? "Waiting for the moderator." : "Moderation happens after the assessor records a result."}</p>
          )}
          {isModerator && e.result && e.moderation === "pending" && <ModerateForm enrolmentId={e.id} />}
        </div>
        <p className="small muted">Printed from the Training Africa Academy learning platform on {day(new Date().toISOString())}. Every change to this portfolio is recorded in the Academy's audit log.</p>
      </div>
    </section>
  );
}
