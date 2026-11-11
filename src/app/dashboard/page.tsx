import Link from "next/link";
import { KindBadge } from "@/components/CourseBits";
import InstallApp from "@/components/AppInstall";
import PortalShell from "@/components/PortalShell";
import { PortalHead, Ring, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";
import { rand } from "@/lib/format";

export const metadata = { title: "Student portal" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await loadStudent("/dashboard");
  const { courses, current, duePlans, messages, unread, recommendations, certificates } = s;
  const inProgress = courses.filter((c) => (c.courses.has_lms ? c.pct < 100 : !c.result)).length;
  const nextPay = [...duePlans].sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0))[0];

  // Things that need the learner's attention, most urgent first
  type Todo = { key: string; title: string; detail: string; href: string; cta: string };
  const todos: Todo[] = [];
  for (const p of duePlans) todos.push({ key: `pay-${p.id}`, title: `Instalment ${p.count + 1} of ${p.of}: ${p.title}`, detail: `${rand(p.nextAmount)}${p.due ? ` · due ${day(p.due)}` : ""}`, href: "/dashboard/payments", cta: "Pay" });
  for (const c of courses) {
    if (!c.courses.certificate_auto && !c.poe_submitted_at && !c.result) todos.push({ key: `poe-${c.id}`, title: `Portfolio of evidence: ${c.courses.title}`, detail: "Add your evidence and sign the declaration", href: `/poe/${c.id}`, cta: "Open" });
    if (c.courses.has_lms && c.next && c !== current) todos.push({ key: `les-${c.id}`, title: `Next lesson: ${c.next.title}`, detail: `${c.courses.title} · ${c.next.minutes} min`, href: `/learn/${c.courses.slug}/${c.next.id}`, cta: "Start" });
    if (!c.courses.has_lms && c.courses.intakes?.[0] && !c.result) todos.push({ key: `cls-${c.id}`, title: `Class: ${c.courses.title}`, detail: `Starts ${c.courses.intakes[0]} · ${c.courses.location}`, href: `/courses/${c.courses.slug}`, cta: "Details" });
  }

  return (
    <PortalShell s={s}>
      <PortalHead eyebrow={new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} title={`Welcome back, ${s.firstName}`} />

      <div className="stat-tiles">
        <Link href="/dashboard/courses" className="tile"><b className="tnum">{inProgress}</b><span>{inProgress === 1 ? "course in progress" : "courses in progress"}</span></Link>
        <Link href="/dashboard/courses" className="tile"><b className="tnum">{s.lessonsDone}</b><span>lessons completed</span></Link>
        <Link href="/dashboard/results" className="tile"><b className="tnum">{certificates.length}</b><span>{certificates.length === 1 ? "certificate" : "certificates"}</span></Link>
        <Link href="/dashboard/payments" className={`tile${nextPay ? " warn" : ""}`}>
          <b className="tnum">{nextPay ? rand(nextPay.nextAmount) : "Paid up"}</b>
          <span>{nextPay ? `next instalment${nextPay.due ? `, ${day(nextPay.due)}` : ""}` : "no payments due"}</span>
        </Link>
      </div>

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

      {courses.length === 0 && (
        <div className="panel stack">
          <h2 className="h3">You haven&apos;t enrolled in a course yet</h2>
          <p className="muted">Browse the catalogue, pay online and your course appears here straight away.</p>
          <div><Link className="btn btn-primary" href="/courses">Find a course</Link></div>
        </div>
      )}

      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {todos.length > 0 && (
            <div className="panel stack" style={{ gap: 4 }}>
              <h2 className="h3">To do</h2>
              {todos.slice(0, 6).map((t) => (
                <div className="todo" key={t.key}>
                  <span style={{ minWidth: 0 }}><b>{t.title}</b><br /><span className="small muted">{t.detail}</span></span>
                  <Link className="btn btn-ghost btn-sm" href={t.href}>{t.cta}</Link>
                </div>
              ))}
            </div>
          )}

          {courses.length > 0 && (
            <div className="panel stack" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 className="h3">My courses</h2>
                <Link className="small" href="/dashboard/courses">See all →</Link>
              </div>
              {courses.slice(0, 4).map((c) => (
                <Link key={c.id} href={c.courses.has_lms ? `/learn/${c.courses.slug}` : "/dashboard/courses"} className="mini-course">
                  <Ring pct={c.courses.has_lms ? c.pct : 0} size={44} />
                  <span style={{ minWidth: 0 }}><b>{c.courses.title}</b><br /><span className="small muted">{c.courses.has_lms ? `${c.doneCount} of ${c.total} lessons` : `Classroom · ${c.courses.intakes?.[0] ?? ""}`}</span></span>
                  <KindBadge course={c.courses} />
                </Link>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="panel stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 className="h3">Messages {unread > 0 && <span className="badge b-warn">{unread} new</span>}</h2>
                <Link className="small" href="/dashboard/messages">All messages →</Link>
              </div>
              {messages.slice(0, 3).map((m) => (
                <div key={m.id} className="msg">
                  <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 10 }}>
                    <b style={{ fontWeight: m.read_at ? 600 : 800 }}>{m.subject}</b>
                    <span className="small muted" style={{ whiteSpace: "nowrap" }}>{day(m.created_at)}</span>
                  </div>
                  <p className="small muted">{m.body}</p>
                </div>
              ))}
            </div>
          )}
          <InstallApp />
        </div>

        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack">
            <div className="eyebrow">Recommended next</div>
            <p className="small muted" style={{ margin: 0 }}>Based on what you&apos;re studying</p>
            {recommendations.map((c) => (
              <Link key={c.id} className="lbtn" href={`/courses/${c.slug}`} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", borderRadius: 0 }}>
                <span><b>{c.title}</b><br /><span className="small muted">{c.format} · {c.price_cents ? rand(c.price_cents) : "Quote on request"}</span></span>
              </Link>
            ))}
            <Link className="btn btn-ghost btn-sm" href="/courses">Browse all courses</Link>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
