import Link from "next/link";
import { KindBadge } from "@/components/CourseBits";
import PortalShell from "@/components/PortalShell";
import { PortalHead, Ring, ResultBadge, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";

export const metadata = { title: "My courses" };
export const dynamic = "force-dynamic";

export default async function MyCourses() {
  const s = await loadStudent("/dashboard/courses");
  return (
    <PortalShell s={s}>
      <PortalHead eyebrow="Student portal" title="My courses">
        <Link className="btn btn-ghost btn-sm" href="/courses">Find another course</Link>
      </PortalHead>
      {s.courses.length === 0 && (
        <div className="panel stack">
          <p className="muted">Courses you pay for, or that your employer enrols you in, appear here.</p>
          <div><Link className="btn btn-primary" href="/courses">Find a course</Link></div>
        </div>
      )}
      {s.courses.map((c) => (
        <article className="panel stack course-panel" key={c.id}>
          <div className="enrol" style={{ padding: 0 }}>
            <Ring pct={c.courses.has_lms ? c.pct : 0} />
            <div className="stack" style={{ gap: 4, minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}><KindBadge course={c.courses} /><span className="small muted">Enrolled {day(c.created_at)}</span></div>
              <h2 className="h3">{c.courses.title}</h2>
              <p className="small muted">
                {c.courses.has_lms
                  ? c.pct === 100 ? "All lessons complete." : `${c.doneCount} of ${c.total} lessons · about ${c.minutesLeft} min to go`
                  : `${c.courses.format} · ${c.courses.location}${c.courses.intakes?.[0] ? ` · starts ${c.courses.intakes[0]}` : ""}`}
              </p>
              {!c.courses.certificate_auto && <p className="small"><ResultBadge result={c.result} moderation={c.moderation} poe={c.poe_submitted_at} /></p>}
            </div>
            <div className="stack" style={{ gap: 6, alignItems: "stretch" }}>
              {c.courses.has_lms && <Link className="btn btn-primary btn-sm" href={`/learn/${c.courses.slug}`}>{c.pct === 100 ? "Review" : c.pct > 0 ? "Resume" : "Start"}</Link>}
              {!c.courses.certificate_auto && <Link className="btn btn-ghost btn-sm" href={`/poe/${c.id}`}>Portfolio</Link>}
              <Link className="btn btn-ghost btn-sm" href={`/courses/${c.courses.slug}`}>Course info</Link>
            </div>
          </div>
          {c.courses.has_lms && c.modules.length > 0 && (
            <details className="modules">
              <summary>Modules and lessons</summary>
              {c.modules.map((m) => {
                const doneHere = m.lessons.filter((l) => s.done.has(l.id)).length;
                return (
                  <div key={m.position} className="module-row">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <b>Module {m.position}: {m.title}</b>
                      <span className="small muted tnum">{doneHere}/{m.lessons.length}</span>
                    </div>
                    <ul>
                      {m.lessons.map((l) => (
                        <li key={l.id}>
                          <span className={`st ${s.done.has(l.id) ? "ok" : ""}`} aria-label={s.done.has(l.id) ? "Done" : "Not done"}>{s.done.has(l.id) ? "✓" : ""}</span>
                          <Link href={`/learn/${c.courses.slug}/${l.id}`}>{l.title}</Link>
                          <span className="small muted"> · {l.kind === "quiz" ? "Quiz" : l.kind === "download" ? "Download" : "Video"} · {l.minutes} min</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </details>
          )}
        </article>
      ))}
    </PortalShell>
  );
}
