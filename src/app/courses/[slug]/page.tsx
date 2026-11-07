import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard, KindBadge, PriceBlock } from "@/components/CourseBits";
import TrackedLink from "@/components/TrackedLink";
import { getCourse, getOutline, relatedCourses } from "@/lib/courses";
import { rand, vatIncluded, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourse((await params).slug);
  return { title: course?.title ?? "Course", description: course?.summary ?? undefined };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();
  const [outline, related] = await Promise.all([getOutline(course.id), relatedCourses(course)]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let enrolled = false;
  if (user) {
    const { data } = await supabase.from("enrolments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
    enrolled = !!data;
  }

  const showAccreditation = course.kind !== "short";
  const pending = (v: string | null) => (course.accreditation_approved && v ? v : "[To be confirmed]");
  const wa = whatsappLink(`Hi Training Africa Academy, I'm interested in ${course.title} (${course.code}). Please send me the next dates and how to enrol.`);

  let cta: React.ReactNode;
  if (course.kind === "qualification") cta = <Link className="btn btn-primary" href={`/learnerships/apply?course=${course.slug}`}>Apply for the {course.intakes[0] ?? "next intake"}</Link>;
  else if (course.price_basis !== "fixed") cta = <Link className="btn btn-primary" href={`/employers?course=${course.slug}`}>Request a quotation</Link>;
  else if (enrolled && course.has_lms) cta = <Link className="btn btn-primary" href={`/learn/${course.slug}`}>Continue learning</Link>;
  else if (enrolled) cta = <Link className="btn btn-primary" href="/dashboard">You're enrolled: view dashboard</Link>;
  else cta = <Link className="btn btn-primary" href={`/checkout/${course.slug}`}>Enrol and pay</Link>;

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href="/courses">Courses</Link><span>/</span><span>{course.title}</span></div>
        <div className="detail">
          <div className="stack" style={{ gap: 26, minWidth: 0 }}>
            <div className="stack">
              <div className="row" style={{ gap: 6 }}>
                <KindBadge course={course} />
                <span className="badge b-short">{course.subject}</span>
                <span className="mono muted">{course.code}</span>
              </div>
              <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)" }}>{course.title}</h1>
              <p className="muted" style={{ fontSize: "1.08rem" }}>{course.summary}</p>
            </div>
            <dl className="specs" style={{ margin: 0 }}>
              <div><dt>Duration</dt><dd>{course.duration}</dd></div>
              <div><dt>Delivery</dt><dd>{course.format_note ?? course.format}</dd></div>
              <div><dt>Location</dt><dd>{course.location}</dd></div>
              <div><dt>Next intake</dt><dd>{course.intakes[0] ?? "On request"}</dd></div>
              {showAccreditation && (
                <>
                  <div><dt>Accrediting body</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.accreditation_body)}</dd></div>
                  <div><dt>SAQA ID</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.saqa_id)}</dd></div>
                  <div><dt>NQF level</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.nqf_level)}</dd></div>
                  <div><dt>Credits</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.credits)}</dd></div>
                </>
              )}
              <div><dt>Certificate</dt><dd>{course.certificate}</dd></div>
            </dl>
            {showAccreditation && !course.accreditation_approved && (
              <div className="notice"><b>Compliance</b><span>Accreditation details appear once the Academy signs them off against the current approval letter.</span></div>
            )}
            {course.practical && <div className="notice info"><b>Practical</b><span>{course.practical}</span></div>}
            <div className="stack">
              <h2 style={{ fontSize: "1.35rem" }}>What you will be able to do</h2>
              <ul className="ticks">{course.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
            <div className="grid g2">
              <div className="stack"><h3>Who it is for</h3><p className="muted">{course.audience}</p></div>
              <div className="stack"><h3>Entry requirements</h3><p className="muted">{course.entry_requirements}</p></div>
              <div className="stack"><h3>Assessment</h3><p className="muted">{course.assessment}</p></div>
              <div className="stack"><h3>Intakes</h3><p className="muted">{course.intakes.join(" · ")}</p></div>
            </div>
            {outline.length > 0 && (
              <div className="stack">
                <h2 style={{ fontSize: "1.35rem" }}>Modules</h2>
                <div className="modlist">
                  {outline.map((m, i) => (
                    <details key={m.id} open={i === 0}>
                      <summary><span>Module {m.position}: {m.title}</span><span className="muted small">{m.lessons.length} items</span></summary>
                      <ul>{m.lessons.map((l) => <li key={l.id}>{l.title} <span className="small">({l.minutes} min)</span></li>)}</ul>
                    </details>
                  ))}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <div className="stack">
                <h2 style={{ fontSize: "1.35rem" }}>Related courses</h2>
                <div className="grid g2">{related.map((c) => <CourseCard key={c.id} course={c} />)}</div>
              </div>
            )}
          </div>
          <aside className="buybox panel stack" style={{ gap: 14 }}>
            <PriceBlock course={course} />
            {course.price_basis === "fixed" && course.price_cents != null && (
              <p className="small muted tnum">Includes VAT of {rand(vatIncluded(course.price_cents))}</p>
            )}
            {cta}
            {course.brochure_url ? (
              <TrackedLink className="btn btn-ghost" href={course.brochure_url} target="_blank" rel="noopener" event="brochure_download" params={{ item: course.code }}>
                Download course brochure (PDF)
              </TrackedLink>
            ) : (
              <span className="small muted">Brochure coming soon</span>
            )}
            <TrackedLink className="btn btn-wa" href={wa} target="_blank" rel="noopener" event="whatsapp_click" params={{ item: course.code }}>
              Ask about this course on WhatsApp
            </TrackedLink>
            <p className="small muted">Training a group? <Link href={`/employers?course=${course.slug}`}>Request a group quote</Link> for bulk pricing and on-site delivery.</p>
          </aside>
        </div>
      </div>
      <div className="mobile-buy">
        <PriceBlock course={course} />
        {cta}
      </div>
    </section>
  );
}
