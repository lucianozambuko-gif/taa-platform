import Link from "next/link";
import { redirect } from "next/navigation";
import { QuickLinks, Tile, TodoList, WorkHead, today, type Todo } from "@/components/WorkBits";
import { homeFor } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";

export const metadata = { title: "Content studio" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
type C = Course & { modules: { lessons: { id: string }[] }[] };

/** What is still missing before a course page is complete (RFQ F04 course template, section 6 sign-off). */
function gaps(c: C) {
  const out: string[] = [];
  const lessons = c.modules.flatMap((m) => m.lessons).length;
  if (c.price_basis === "fixed" && !c.price_cents) out.push("no price");
  if (c.has_lms && !lessons) out.push("no online lessons yet");
  if (!c.image_url) out.push("no photo");
  if (!c.brochure_url) out.push("no brochure PDF");
  if (!c.intakes?.length) out.push("no intake dates");
  if (!c.summary) out.push("no summary");
  if (c.kind !== "short" && !c.accreditation_approved) out.push("accreditation wording not signed off");
  return out;
}

/** Where the content editor lands: approvals, drafts, and which course pages still need work. */
export default async function ContentOverview() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/content");
  const role = profile?.role ?? "learner";
  if (role !== "content" && role !== "admin") redirect(homeFor(role));

  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: courseRows }, { data: proposals }, { data: posts }, { data: events }, { data: redirects }] = await Promise.all([
    supabase.from("courses").select("*, modules(lessons(id))").order("title"),
    supabase.from("lesson_proposals").select("id, title, kind, created_at").eq("status", "pending").order("created_at"),
    supabase.from("posts").select("id, title, published, updated_at").order("updated_at", { ascending: false }).limit(50),
    supabase.from("site_events").select("kind, label, path").eq("kind", "search").gte("created_at", since).limit(500),
    supabase.from("redirects").select("from_path"),
  ]);
  const courses = (courseRows ?? []) as unknown as C[];
  const live = courses.filter((c) => c.published);
  const hidden = courses.filter((c) => !c.published);
  const lessons = courses.reduce((a, c) => a + c.modules.flatMap((m) => m.lessons).length, 0);
  const drafts = (posts ?? []).filter((p) => !p.published);
  const todoCourses = live.map((c) => ({ c, g: gaps(c) })).filter((x) => x.g.length).sort((a, b) => b.g.length - a.g.length);
  const missed = new Map<string, number>();
  for (const e of events ?? []) if (e.label && String(e.path ?? "").includes("(0 results)")) missed.set(String(e.label).toLowerCase(), (missed.get(String(e.label).toLowerCase()) ?? 0) + 1);
  const topMissed = [...missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const todos: Todo[] = [];
  if ((proposals ?? []).length) todos.push({ key: "appr", n: proposals!.length, tone: "bad", title: `lesson or quiz ${proposals!.length === 1 ? "suggestion is" : "suggestions are"} waiting for your approval`, detail: proposals!.slice(0, 3).map((p) => p.title).join(", "), href: "/admin?tab=approvals", cta: "Review" });
  if (drafts.length) todos.push({ key: "drafts", n: drafts.length, title: `${drafts.length === 1 ? "article is" : "articles are"} still a draft`, detail: drafts.slice(0, 3).map((p) => p.title).join(", "), href: "/admin?tab=content&view=news", cta: "Publish" });
  if (todoCourses.length) todos.push({ key: "gaps", n: todoCourses.length, title: `live course ${todoCourses.length === 1 ? "page is" : "pages are"} missing something`, detail: "See the checklist below", href: "#checklist", cta: "See list" });
  if (hidden.length) todos.push({ key: "hidden", n: hidden.length, title: `${hidden.length === 1 ? "course is" : "courses are"} hidden from the website`, detail: hidden.slice(0, 3).map((c) => c.title).join(", "), href: "/admin?tab=courses", cta: "Check" });
  if (topMissed.length) todos.push({ key: "search", n: topMissed.length, title: "searches found nothing on the site", detail: topMissed.slice(0, 4).map(([q]) => `“${q}”`).join(", "), href: "/admin?tab=content&view=faqs", cta: "Add an FAQ" });

  return (
    <>
      <WorkHead eyebrow={today()} title={`Good day, ${(profile?.full_name ?? "").split(" ")[0] || "there"}`}>
        <span className="row" style={{ gap: 6 }}>
          <Link className="btn btn-primary btn-sm" href="/admin/courses/new">Add a course</Link>
          <Link className="btn btn-ghost btn-sm" href="/admin/posts/new">New article</Link>
        </span>
      </WorkHead>

      <div className="stat-tiles">
        <Tile href="/admin?tab=approvals" value={(proposals ?? []).length} label="suggestions to approve" warn={(proposals ?? []).length > 0} />
        <Tile href="/admin?tab=courses" value={`${live.length}/${courses.length}`} label="courses live on the website" />
        <Tile href="/admin?tab=courses" value={lessons} label="online lessons and quizzes" />
        <Tile href="/admin?tab=content&view=news" value={drafts.length} label={drafts.length === 1 ? "draft article" : "draft articles"} />
      </div>

      <div className="dash">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <TodoList todos={todos} empty="Everything is published and complete. Facilitators' lesson suggestions appear here for approval." />

          <div className="panel stack checklist" style={{ gap: 4 }} id="checklist">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="h3">Course page checklist</h2>
              <Link className="small" href="/admin?tab=courses">All courses →</Link>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Live courses that are missing part of the course page template.</p>
            {todoCourses.slice(0, 8).map(({ c, g }) => (
              <div className="todo" key={c.id}>
                <span style={{ minWidth: 0 }}><b>{c.title}</b><br /><span className="small muted">{g.join(" · ")}</span></span>
                <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  {c.has_lms && <Link className="btn btn-ghost btn-sm" href={`/admin/courses/${c.id}/lessons`}>Lessons</Link>}
                  <Link className="btn btn-ghost btn-sm" href={`/admin/courses/${c.id}`}>Edit</Link>
                </span>
              </div>
            ))}
            {!todoCourses.length && <p className="small muted">Every live course has a price, photo, brochure, dates and lessons.</p>}
          </div>
        </div>

        <aside className="stack" style={{ gap: 14 }}>
          <div className="panel stack" style={{ gap: 8 }}>
            <div className="eyebrow">Recently edited articles</div>
            {(posts ?? []).slice(0, 4).map((p) => (
              <Link key={p.id} className="lbtn" href={`/admin/posts/${p.id}`} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", borderRadius: 0, justifyContent: "space-between" }}>
                <span style={{ minWidth: 0 }}><b>{p.title}</b><br /><span className="small muted">{day(p.updated_at)}</span></span>
                <span className={`badge ${p.published ? "b-good" : "b-warn"}`}>{p.published ? "Live" : "Draft"}</span>
              </Link>
            ))}
            {!(posts ?? []).length && <p className="small muted" style={{ margin: 0 }}>No articles yet.</p>}
            <Link className="btn btn-ghost btn-sm" href="/admin/posts/new">Write an article</Link>
          </div>
          {topMissed.length > 0 && (
            <div className="panel stack" style={{ gap: 8 }}>
              <div className="eyebrow">People searched, found nothing</div>
              <div className="row" style={{ gap: 6 }}>{topMissed.map(([q, c]) => <span key={q} className="badge b-short">{q} · {c}</span>)}</div>
            </div>
          )}
          <QuickLinks links={[["/content/media", "Upload a photo or PDF"], ["/admin?tab=content&view=home", "Homepage and announcement bar"], ["/admin?tab=content&view=seo", `Page titles, SEO and ${(redirects ?? []).length} redirects`], ["/campaigns", "Campaign landing pages"], ["/", "View the website"]]} />
        </aside>
      </div>
    </>
  );
}
