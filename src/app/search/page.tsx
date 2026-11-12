import PageHero from "@/components/PageHero";
import Link from "next/link";
import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";
import { listPosts } from "@/lib/posts";
import { SEO_PAGES } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { whatsappLink } from "@/lib/format";
import { norm, score } from "@/lib/searchScore";

export const metadata = { title: "Search", description: "Search courses, articles, FAQs and pages at Training Africa Academy." };
export const dynamic = "force-dynamic";

function snippet(text: string, words: string[]) {
  const i = Math.max(0, ...words.map((w) => norm(text).indexOf(w)).filter((n) => n >= 0).slice(0, 1));
  const start = Math.max(0, i - 60);
  return (start ? "…" : "") + text.slice(start, start + 180).trim() + (text.length > start + 180 ? "…" : "");
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  const { t } = await getT();
  let courses: Awaited<ReturnType<typeof listCourses>> = [];
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let faqs: { q: string; a: string }[] = [];
  if (words.length) {
    const supabase = await createClient();
    const [c, p, f] = await Promise.all([
      listCourses(),
      listPosts(),
      supabase.from("site_content").select("value").eq("key", "faqs").maybeSingle(),
    ]);
    courses = c.map((x) => ({ x, s: score(words, x.title, [x.summary, x.subject, x.code, x.kind === "short" ? "short course" : x.kind, x.saqa_id, x.nqf_level ? `nqf ${x.nqf_level}` : "", x.location, x.format, x.audience, x.accreditation_body, ...(x.outcomes ?? [])].filter(Boolean).join(" ")) }))
      .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x);
    posts = p.map((x) => ({ x, s: score(words, x.title, `${x.summary ?? ""} ${x.category} ${x.body}`) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x).slice(0, 6);
    faqs = (Array.isArray(f.data?.value) ? (f.data.value as { q: string; a: string }[]) : []).filter((x) => score(words, x.q, x.a) > 0).slice(0, 6);
    try {
      await supabase.from("site_events").insert({ kind: "search", label: q, path: `/search (${courses.length + posts.length + faqs.length} results)` });
    } catch {}
  }
  const pages = words.length ? SEO_PAGES.filter((p) => p.path !== "/" && score(words, p.title, p.description) > 0).slice(0, 5) : [];
  const total = courses.length + posts.length + faqs.length + pages.length;

  return (
    <>
    <PageHero eyebrow={t("nav.search")} title={<>{q ? <>Results for “{q}”</> : "Search the Academy"}</>} photo="training-and-practical-june-25-11"></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 12, maxWidth: 720 }}>
          <form className="search" action="/search" role="search">
            <input name="q" defaultValue={q} aria-label={t("nav.search")} placeholder={t("home.searchPh")} autoFocus={!q} />
            <button className="btn btn-primary">{t("nav.search")}</button>
          </form>
          {q && <p className="small muted" role="status">{total ? `${total} result${total === 1 ? "" : "s"} across courses, articles, FAQs and pages` : "No matches."}</p>}
        </div>

        {q && !total && (
          <div className="panel stack" style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: "1.15rem" }}>Nothing found for “{q}”</h2>
            <p className="muted">Try a shorter word (for example “cleaning”, “safety” or “NQF 2”), browse <Link href="/courses">all courses</Link>, or ask an advisor.</p>
            <div><a className="btn btn-primary btn-sm" target="_blank" rel="noopener" href={whatsappLink(`Hi, I searched the website for "${q}" and couldn't find it. Can you help?`, "advisor")}>Ask on WhatsApp</a></div>
          </div>
        )}

        {courses.length > 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: "1.3rem" }}>Courses <span className="muted tnum">({courses.length})</span></h2>
            <div className="grid g3">{courses.slice(0, 9).map((c) => <CourseCard key={c.id} course={c} />)}</div>
            {courses.length > 9 && <div><Link className="btn btn-ghost btn-sm" href={`/courses?q=${encodeURIComponent(q)}`}>See all {courses.length} courses</Link></div>}
          </div>
        )}

        {(faqs.length > 0 || posts.length > 0 || pages.length > 0) && (
          <div className="grid g2" style={{ alignItems: "start" }}>
            {faqs.length > 0 && (
              <div className="stack" style={{ gap: 10 }}>
                <h2 style={{ fontSize: "1.3rem" }}>Questions and answers</h2>
                <div className="modlist">
                  {faqs.map((f, i) => (
                    <details key={f.q} open={i === 0}><summary><span>{f.q}</span></summary><p className="muted" style={{ padding: "0 16px 14px" }}>{f.a}</p></details>
                  ))}
                </div>
                <Link className="small" href="/faqs">All FAQs →</Link>
              </div>
            )}
            <div className="stack" style={{ gap: 10 }}>
              {posts.length > 0 && (
                <>
                  <h2 style={{ fontSize: "1.3rem" }}>Articles and news</h2>
                  {posts.map((p) => (
                    <Link key={p.id} href={`/news/${p.slug}`} className="panel" style={{ textDecoration: "none", color: "inherit", padding: 14 }}>
                      <b>{p.title}</b><br /><span className="small muted">{snippet(p.summary || p.body, words)}</span>
                    </Link>
                  ))}
                </>
              )}
              {pages.length > 0 && (
                <>
                  <h2 style={{ fontSize: "1.3rem", marginTop: posts.length ? 8 : 0 }}>Pages</h2>
                  {pages.map((p) => (
                    <Link key={p.path} href={p.path} className="panel" style={{ textDecoration: "none", color: "inherit", padding: 14 }}>
                      <b>{p.title}</b><br /><span className="small muted">{p.description}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {!q && (
          <div className="row" style={{ gap: 8 }}>
            <span className="small muted">Popular:</span>
            {["Cleaning", "Health and safety", "First aid", "Supervisor", "Learnership", "Online"].map((w) => (
              <Link key={w} className="btn btn-ghost btn-sm" href={`/search?q=${encodeURIComponent(w)}`}>{w}</Link>
            ))}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
