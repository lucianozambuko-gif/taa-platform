import LeadForm from "@/components/LeadForm";
import TrackedLink from "@/components/TrackedLink";
import { listCourses } from "@/lib/courses";
import { seoFor } from "@/lib/seo";
import QuoteEstimator from "@/components/QuoteEstimator";

export const generateMetadata = () => seoFor("/employers");
export const dynamic = "force-dynamic";

export default async function EmployersPage({ searchParams }: { searchParams: Promise<{ course?: string; staff?: string; est?: string; where?: string }> }) {
  const { course, staff, est, where } = await searchParams;
  const courses = await listCourses();
  return (
    <>
      <section className="block" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <div className="eyebrow">Training for employers</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px", maxWidth: "22ch" }}>Train your team, on-site or at our centre</h1>
          <p className="muted" style={{ maxWidth: "60ch", fontSize: "1.08rem" }}>
            Tell us what your team needs. A training advisor sends a quotation within one working day, with group pricing and dates that fit your shifts.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <TrackedLink className="btn btn-ghost" href={process.env.NEXT_PUBLIC_CORPORATE_BROCHURE_URL || "/corporate-brochure.pdf"} target="_blank" rel="noopener" event="brochure_download" params={{ item: "corporate" }}>
              Download corporate brochure (PDF)
            </TrackedLink>
            <span className="small muted">Accredited and skills programmes, on-site delivery, progress reports</span>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ marginBottom: 20 }}>
          <QuoteEstimator courses={courses.map((c) => ({ slug: c.slug, title: c.title, price_cents: c.price_cents, price_basis: c.price_basis }))} initial={course} />
        </div>
        <div className="wrap grid g2" style={{ alignItems: "start" }} id="quote">
          <LeadForm
            type="group_quote"
            source="employer_page"
            submitLabel="Send quote request"
            successTitle="Thank you. Your quote request is in."
            successText="It has been routed to {team}, who will email you a quotation within one working day."
          >
            <h2 style={{ fontSize: "1.35rem" }}>Request a group quote</h2>
            <div className="grid g2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" required /></div>
              <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required /></div>
              <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" /></div>
              <div className="field">
                <label htmlFor="industry">Industry</label>
                <select id="industry" name="industry">
                  <option>Facilities and cleaning</option><option>Hospitality</option><option>Healthcare</option><option>Retail</option><option>Manufacturing</option><option>Other</option>
                </select>
              </div>
              <div className="field"><label htmlFor="staff_count">Number of staff</label><input id="staff_count" name="staff_count" type="number" min={1} required defaultValue={staff ?? ""} /></div>
            </div>
            <div className="field">
              <label htmlFor="course">Course or training need</label>
              <select id="course" name="course" defaultValue={course ?? ""}>
                <option value="">Something else / not sure</option>
                {courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="delivery">Preferred delivery</label>
              <select id="delivery" name="delivery" defaultValue={where === "centre" ? "At the Academy, Johannesburg" : "On-site at our premises"}><option>On-site at our premises</option><option>At the Academy, Johannesburg</option><option>Online</option><option>Not sure yet</option></select>
            </div>
            <div className="field"><label htmlFor="note">Anything we should know?</label><textarea id="note" name="note" defaultValue={est ? `Instant estimate on the website: R${Number(est).toLocaleString("en-US")} for ${staff} staff.` : ""} /></div>
          </LeadForm>

          <LeadForm
            type="multi_learner"
            source="employer_page"
            submitLabel="Submit learners for enrolment"
            successTitle="Learners submitted"
            successText="{team} will confirm the enrolments and send each learner their login details."
          >
            <h2 style={{ fontSize: "1.35rem" }}>Register several staff at once</h2>
            <p className="muted small">Already have a quote or purchase order? List your learners, one per line as name and email, and we enrol them for you.</p>
            <div className="grid g2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="ml-company">Company</label><input id="ml-company" name="company" required /></div>
              <div className="field"><label htmlFor="ml-name">Your name</label><input id="ml-name" name="name" required /></div>
              <div className="field"><label htmlFor="ml-email">Work email</label><input id="ml-email" name="email" type="email" required /></div>
              <div className="field">
                <label htmlFor="ml-course">Course</label>
                <select id="ml-course" name="course" defaultValue={course ?? ""} required>
                  <option value="" disabled>Choose a course</option>
                  {courses.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="learners">Learners (name, email per line)</label>
              <textarea id="learners" name="learners" required placeholder={"Sipho Dlamini, sipho@company.co.za\nAyesha Patel, ayesha@company.co.za"} />
            </div>
          </LeadForm>
        </div>
      </section>
    </>
  );
}
