import Link from "next/link";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/terms");

const SECTIONS: [string, string[]][] = [
  ["Enrolment", [
    "You enrol by paying online, by an employer purchase order, or through an approved learnership application.",
    "Entry requirements are shown on each course page. For accredited programmes the Academy may ask for documents before confirming your place.",
  ]],
  ["Prices and payment", [
    "Prices are in rand and include VAT where applicable. The checkout shows the full amount before you pay.",
    "Card and Instant EFT payments are processed by PayFast. The Academy never sees or stores your card details.",
    "Discount codes only work when the Academy has approved them, and only one code can be used per enrolment.",
  ]],
  ["Cancellations and refunds", [
    "Online courses: you may cancel within 7 days of payment for a full refund if you have completed less than 20% of the course.",
    "Classroom and blended courses: cancel at least 5 working days before the start date for a full refund, or move to a later date free of charge once.",
    "Refunds are paid back to the original payment method. When a refund is paid, access to the course ends.",
  ]],
  ["Online learning", [
    "Your account is for you only. Do not share your login or course materials.",
    "Online lessons cover theory and demonstrations. They do not replace practical days, workplace experience, supervised assessments or external examinations where a programme requires them.",
    "Quizzes have a 70% pass mark and can be retaken.",
  ]],
  ["Assessment, results and certificates", [
    "Short online skills courses issue a certificate of completion automatically only where the Academy has approved this.",
    "Accredited programmes are assessed by Academy facilitators. Official certificates are issued by the relevant accrediting body, not by this website.",
    "You may appeal an assessment result in writing within 10 working days.",
  ]],
  ["Learner conduct", [
    "Treat facilitators, staff and other learners with respect, follow safety rules in practical sessions, and submit only your own work.",
  ]],
  ["Employers", [
    "Employers who pay for staff training may receive progress and completion reports for those learners. Learners are told about this when they are enrolled.",
  ]],
  ["Your information", [
    "How we use and protect your personal information is explained in our privacy notice.",
  ]],
];

export default function TermsPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ maxWidth: 760, gap: 16 }}>
        <div className="eyebrow">Policies</div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.5rem)" }}>Terms and learner policies</h1>
        <div className="notice"><b>Draft</b><span>Template wording for the demo. Training Africa Academy must approve the final terms, refund periods and appeal process.</span></div>
        {SECTIONS.map(([h, ps]) => (
          <div key={h} className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem" }}>{h}</h2>
            {ps.map((p) => <p key={p}>{p}</p>)}
          </div>
        ))}
        <p className="muted">See also the <Link href="/privacy">privacy notice</Link>. Questions? <Link href="/contact">Contact us</Link>.</p>
      </div>
    </section>
  );
}
