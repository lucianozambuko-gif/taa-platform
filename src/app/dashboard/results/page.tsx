import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { PortalHead, ResultBadge, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";

export const metadata = { title: "Results and certificates" };
export const dynamic = "force-dynamic";

export default async function Results() {
  const s = await loadStudent("/dashboard/results");
  const quizIds = s.quizzes.map((q) => q.id);
  const { data: reviewRows } = quizIds.length ? await s.supabase.from("lesson_content").select("lesson_id, quiz_review").in("lesson_id", quizIds) : { data: [] };
  const reviewOf = (id: string) => (reviewRows ?? []).find((r) => r.lesson_id === id)?.quiz_review ?? "full";
  const accredited = s.courses.filter((c) => !c.courses.certificate_auto);
  const online = s.courses.filter((c) => c.courses.has_lms && c.courses.certificate_auto);
  return (
    <PortalShell s={s}>
      <PortalHead eyebrow="Student portal" title="Results and certificates" />

      <div className="panel stack">
        <h2 className="h3">Certificates</h2>
        {s.certificates.length === 0 && <p className="muted small">No certificates yet. They appear here as soon as they are issued.</p>}
        {s.certificates.map((c) => (
          <div className="todo" key={c.id}>
            <span style={{ minWidth: 0 }}><b>{c.courses.title}</b><br /><span className="small muted">{c.courses.certificate}</span></span>
            <span className="row" style={{ gap: 8 }}>
              <Link className="btn btn-primary btn-sm" href={`/certificate/${c.courses.slug}`}>View and download</Link>
            </span>
          </div>
        ))}
        <p className="small muted" style={{ margin: 0 }}>Each certificate has a verification link an employer can check, and a button to add it to your LinkedIn profile.</p>
      </div>

      {accredited.length > 0 && (
        <div className="panel stack">
          <h2 className="h3">Assessment results</h2>
          <p className="small muted" style={{ margin: 0 }}>For accredited programmes, your assessor decides the result and a moderator checks it before it is released.</p>
          <div className="table-wrap">
            <table className="tbl stack-sm">
              <thead><tr><th>Programme</th><th>Result</th><th>Portfolio of evidence</th></tr></thead>
              <tbody>
                {accredited.map((c) => (
                  <tr key={c.id}>
                    <td data-label=""><b>{c.courses.title}</b>{c.result_note && <div className="small muted">{c.result_note}</div>}</td>
                    <td data-label="Result"><ResultBadge result={c.result} moderation={c.moderation} poe={c.poe_submitted_at} /></td>
                    <td data-label="Portfolio"><Link href={`/poe/${c.id}`}>{c.poe_submitted_at ? `Submitted ${day(c.poe_submitted_at)}` : "Build my portfolio →"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {online.length > 0 && (
        <div className="panel stack">
          <h2 className="h3">Course completion</h2>
          <div className="table-wrap">
            <table className="tbl stack-sm">
              <thead><tr><th>Course</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {online.map((c) => (
                  <tr key={c.id}>
                    <td data-label=""><b>{c.courses.title}</b></td>
                    <td className="tnum" data-label="Progress">{c.doneCount}/{c.total} lessons<div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${c.pct}%` }} /></div></td>
                    <td data-label="Status">{c.pct === 100 ? <span className="badge b-good">Complete</span> : <Link href={`/learn/${c.courses.slug}`}>Continue →</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel stack">
        <h2 className="h3">Quiz scores</h2>
        {s.quizzes.length === 0 ? (
          <p className="muted small">Your quiz scores appear here after your first quiz. The pass mark is 70%, and you can retake a quiz.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl stack-sm">
              <thead><tr><th>Quiz</th><th>Best score</th><th>Attempts</th><th>Status</th><th><span className="sr-only">Review</span></th></tr></thead>
              <tbody>
                {s.quizzes.map((q) => (
                  <tr key={q.id}>
                    <td data-label=""><b>{q.title}</b><div className="small muted">{q.course}</div></td>
                    <td className="tnum" data-label="Best score">{q.score}%</td>
                    <td className="tnum" data-label="Attempts">{q.tries}</td>
                    <td data-label="Status"><span className={`badge ${q.passed ? "b-good" : "b-warn"}`}>{q.passed ? "Passed" : "Try again"}</span></td>
                    <td data-label="">{reviewOf(q.id) === "off" ? <span className="small muted">Score only</span> : <Link className="btn btn-ghost btn-sm" href={`/dashboard/review/${q.id}`}>Review answers</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
