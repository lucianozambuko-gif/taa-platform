import Link from "next/link";
import { CourseCard, KindBadge, PriceBlock } from "@/components/CourseBits";
import TrackedLink from "@/components/TrackedLink";
import { getCourse, getOutline, relatedCourses } from "@/lib/courses";
import { rand, vatIncluded, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { redirectOrNotFound } from "@/lib/redirects";
import Eligibility from "@/components/Eligibility";
import { getT } from "@/lib/i18n";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourse((await params).slug);
  return {
    title: course?.title ?? "Course",
    description: course?.summary ?? undefined,
    alternates: course ? { canonical: `/courses/${course.slug}` } : undefined,
    openGraph: course ? { title: course.title, description: course.summary ?? undefined, url: `/courses/${course.slug}`, type: "website", locale: "en_ZA" } : undefined,
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, { lang, t }] = await Promise.all([getCourse(slug), getT()]);
  if (!course) return redirectOrNotFound(`/courses/${slug}`);
  const [outline, related] = await Promise.all([getOutline(course.id), relatedCourses(course)]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let enrolled = false;
  let role = "learner";
  if (user) {
    role = (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role ?? "learner";
    const { data } = await supabase.from("enrolments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
    enrolled = !!data;
  }

  const showAccreditation = course.kind !== "short";
  const pending = (v: string | null) => (course.accreditation_approved && v ? v : "[To be confirmed]");
  const wa = whatsappLink(`Hi Training Africa Academy, I'm interested in ${course.title} (${course.code}). Please send me the next dates and how to enrol.`);

  let cta: React.ReactNode;
  if (role === "admin" || role === "content") cta = <Link className="btn btn-primary" href={`/admin/courses/${course.id}`}>Edit this course</Link>;
  else if (role === "sales") cta = <Link className="btn btn-primary" href="/admin?tab=learners">Give a learner access</Link>;
  else if (role === "facilitator") cta = <Link className="btn btn-primary" href={`/facilitator?course=${course.slug}`}>View my learners</Link>;
  else if (course.kind === "qualification") cta = <Link className="btn btn-primary" href={`/learnerships/apply?course=${course.slug}`}>Apply for the {course.intakes[0] ?? "next intake"}</Link>;
  else if (course.price_basis !== "fixed") cta = <Link className="btn btn-primary" href={`/employers?course=${course.slug}`}>Request a quotation</Link>;
  else if (enrolled && course.has_lms) cta = <Link className="btn btn-primary" href={`/learn/${course.slug}`}>Continue learning</Link>;
  else if (enrolled) cta = <Link className="btn btn-primary" href="/dashboard">You're enrolled: view dashboard</Link>;
  else cta = <Link className="btn btn-primary" href={`/checkout/${course.slug}`}>{t("course.enrol")}</Link>;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    courseCode: course.code,
    url: `${site}/courses/${course.slug}`,
    provider: { "@type": "EducationalOrganization", name: "Training Africa Academy", url: site },
    ...(course.price_basis === "fixed" && course.price_cents != null
      ? { offers: { "@type": "Offer", price: (course.price_cents / 100).toFixed(2), priceCurrency: "ZAR", category: "Paid" } }
      : {}),
  };

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
              <p className="muted" style={{ fontSize: "1.08rem" }}>{(lang === "zu" && course.summary_zu) || (lang === "st" && course.summary_st) || course.summary}</p>
            </div>
            <dl className="specs" style={{ margin: 0 }}>
              <div><dt>{t("course.duration")}</dt><dd>{course.duration}</dd></div>
              <div><dt>{t("course.delivery")}</dt><dd>{course.format_note ?? course.format}</dd></div>
              <div><dt>{t("course.location")}</dt><dd>{course.location}</dd></div>
              <div><dt>{t("course.intake")}</dt><dd>{course.intakes[0] ?? "On request"}</dd></div>
              {showAccreditation && (
                <>
                  <div><dt>Accrediting body</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.accreditation_body)}</dd></div>
                  <div><dt>SAQA ID</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.saqa_id)}</dd></div>
                  <div><dt>NQF level</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.nqf_level)}</dd></div>
                  <div><dt>Credits</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.credits)}</dd></div>
                  <div style={{ gridColumn: "1 / -1" }}><dt>Approved scope</dt><dd className={course.accreditation_approved ? "" : "tbc"}>{pending(course.approved_scope)}</dd></div>
                </>
              )}
              <div><dt>{t("course.certificate")}</dt><dd>{course.certificate}</dd></div>
            </dl>
            {showAccreditation && !course.accreditation_approved && (
              <div className="notice"><b>Compliance</b><span>Accreditation details appear once the Academy signs them off against the current approval letter.</span></div>
            )}
            {course.practical && <div className="notice info"><b>Practical</b><span>{course.practical}</span></div>}
            {role === "learner" && !enrolled && (course.eligibility?.length ?? 0) > 0 && (
              <Eligibility
                questions={course.eligibility ?? []}
                title={course.title}
                next={
                  course.kind === "qualification"
                    ? { href: `/learnerships/apply?course=${course.slug}`, label: "Apply now" }
                    : course.price_basis === "fixed"
                      ? { href: `/checkout/${course.slug}`, label: "Enrol and pay" }
                      : { href: `/employers?course=${course.slug}`, label: "Request a quotation" }
                }
              />
            )}
            <div className="stack">
              <h2 style={{ fontSize: "1.35rem" }}>{t("course.outcomes")}</h2>
              <ul className="ticks">{course.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
            <div className="grid g2">
              <div className="stack"><h3>{t("course.who")}</h3><p className="muted">{course.audience}</p></div>
              <div className="stack"><h3>{t("course.entry")}</h3><p className="muted">{course.entry_requirements}</p></div>
              <div className="stack"><h3>{t("course.assessment")}</h3><p className="muted">{course.assessment}</p></div>
              <div className="stack"><h3>{t("course.intakes")}</h3><p className="muted">{course.intakes.join(" · ")}</p></div>
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
            {course.price_basis === "fixed" && course.price_cents != null && (course.instalments ?? 1) > 1 && (
              <p className="small tnum"><b>Or pay in {course.instalments} monthly instalments</b> of about {rand(Math.ceil(course.price_cents / (course.instalments ?? 1)))}, no interest.</p>
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
      {role !== "learner" && (
        <div className="wrap"><p className="small muted" style={{ marginTop: 16 }}>You're signed in as staff ({ROLE_LABEL[role as Role] ?? role}), so you see staff options here. Learners see the enrol, apply or quote button instead.</p></div>
      )}
      <div className="mobile-buy">
        <PriceBlock course={course} />
        {cta}
      </div>
    </section>
  );
}
