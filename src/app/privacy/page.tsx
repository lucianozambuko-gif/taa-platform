import PageHero from "@/components/PageHero";
import { seoFor } from "@/lib/seo";
export const generateMetadata = () => seoFor("/privacy");

export default function PrivacyPage() {
  return (
    <>
    <PageHero eyebrow="POPIA" title={<>Privacy notice</>} photo="pmb-training-5"></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ maxWidth: 760, gap: 16 }}>
        <div className="notice"><b>Draft</b><span>Placeholder wording. Training Africa Academy's Information Officer must approve the final notice.</span></div>
        <h2 style={{ fontSize: "1.3rem" }}>What we collect</h2>
        <p>Your name, contact details and the information needed to enrol you, process payment and keep your learner record. For accredited programmes we may also need identity and education details required for reporting.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Why we use it</h2>
        <p>To enrol you, give you access to your courses, issue results and certificates, answer your enquiries, and meet legal and accreditation requirements. We send marketing only if you opt in.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Payments</h2>
        <p>Card details are entered on our payment provider's secure page. We never see or store your card number.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Who can see it</h2>
        <p>Only staff who need it for their role: sales and admissions staff see enquiries and enrolments, facilitators see only the learners on their own courses, and every change is recorded in an audit log. If your employer paid for your training, they may receive your progress and results.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Where it is stored</h2>
        <p>Our learner database is hosted by Supabase in the European Union (Frankfurt), which has data-protection laws comparable to POPIA. Lesson files are stored privately and can only be opened by enrolled learners.</p>
        <h2 style={{ fontSize: "1.3rem" }}>How long we keep it</h2>
        <p>Enquiries that do not lead to an enrolment: personal details removed after [24] months. Learner records and results: kept for [5] years after your last course, as required for accreditation and certificates. Payment records: kept for 5 years for tax purposes. Periods in brackets are to be confirmed by the Academy.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Your rights</h2>
        <p>You may ask to see, correct or delete your personal information, or object to its use, by contacting our Information Officer at [email to be supplied]. We respond within 30 days. You may also complain to the Information Regulator (inforegulator.org.za).</p>
        <h2 style={{ fontSize: "1.3rem" }}>If something goes wrong</h2>
        <p>If we suspect your information has been accessed without permission, we contain the problem, assess the risk, and notify you and the Information Regulator as soon as reasonably possible, as POPIA section 22 requires.</p>
      </div>
    </section>
    </>
  );
}
