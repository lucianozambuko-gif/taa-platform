import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceBlock } from "@/components/CourseBits";
import LeadForm from "@/components/LeadForm";
import TrackedLink from "@/components/TrackedLink";
import { getCourse } from "@/lib/courses";
import { whatsappLink } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourse((await params).slug);
  return { title: course ? `${course.title}: book your place` : "Campaign", robots: { index: false } };
}

/**
 * Reusable campaign landing page (RFQ section 8): one course, one message, one form.
 * Any course works: /campaigns/<course-slug>?utm_source=facebook
 */
export default async function CampaignPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ utm_source?: string; utm_campaign?: string }> }) {
  const { slug } = await params;
  const { utm_source, utm_campaign } = await searchParams;
  const course = await getCourse(slug);
  if (!course || !course.published) notFound();
  const source = ["campaign", utm_source, utm_campaign].filter(Boolean).join(":");
  return (
    <>
      <section className="hero" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap hero-grid">
          <div className="stack" style={{ gap: 14 }}>
            <span className="eyebrow">{[course.format, course.duration, course.location !== course.format ? course.location : null].filter(Boolean).join(" · ")}</span>
            <h1>{course.title}</h1>
            <p className="lead">{course.summary}</p>
            <ul className="ticks">{course.outcomes.slice(0, 4).map((o) => <li key={o}>{o}</li>)}</ul>
            <div className="row">
              <PriceBlock course={course} />
              {course.price_basis === "fixed" && <Link className="btn btn-primary" href={`/checkout/${course.slug}`}>Enrol now</Link>}
              <TrackedLink className="btn btn-wa" href={whatsappLink(`Hi, I saw your ${course.title} (${course.code}) offer. Please send me the next dates.`)} target="_blank" rel="noopener" event="whatsapp_click" params={{ item: course.code, source }}>
                WhatsApp us
              </TrackedLink>
            </div>
            {course.practical && <p className="small muted">{course.practical}</p>}
          </div>
          <LeadForm type="course_enquiry" source={source} submitLabel="Send me the details" successTitle="Thanks, we'll be in touch" successText="A {team} will contact you within one working day with dates and pricing.">
            <input type="hidden" name="course" value={course.slug} />
            <h2 style={{ fontSize: "1.3rem" }}>Get dates and pricing</h2>
            <div className="field"><label htmlFor="cp-name">Your name</label><input id="cp-name" name="name" required /></div>
            <div className="field"><label htmlFor="cp-phone">Mobile number</label><input id="cp-phone" name="phone" required /></div>
            <div className="field"><label htmlFor="cp-email">Email (optional)</label><input id="cp-email" name="email" type="email" /></div>
            <div className="field"><label htmlFor="cp-staff">How many people? (optional)</label><input id="cp-staff" name="staff_count" type="number" min={1} /></div>
          </LeadForm>
        </div>
      </section>
    </>
  );
}
