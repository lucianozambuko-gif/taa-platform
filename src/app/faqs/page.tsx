import Link from "next/link";
import PlaceholderNote from "@/components/PlaceholderNote";

export const metadata = { title: "Resources and FAQs" };

const FAQS: [string, string][] = [
  ["How do I enrol and pay?", "Open the course page, click Enrol and pay, create your learner account and pay by card or Instant EFT. Online courses open in your dashboard as soon as payment is confirmed."],
  ["Are prices inclusive of VAT?", "Course prices are shown in rand and include VAT where applicable. The checkout shows the full amount before you pay."],
  ["Is this course accredited?", "Each course page shows whether it is accredited, a full qualification or a non-accredited skills course. Accreditation details are only published once confirmed against the Academy's approval letters."],
  ["Can I do practicals online?", "No. Online lessons cover theory and demonstrations. Practical days, workplace experience and supervised assessments happen in person where a programme requires them."],
  ["Can my employer pay for my course?", "Yes. Your employer can request a group quote or register several staff at once from the For employers page."],
  ["I can't log in. What should I do?", "Use the email you enrolled with. If you still can't get in, WhatsApp learner support and we'll help you reset your access."],
  ["How is my personal information used?", "Only to enrol you, run your courses and issue results, as described in our privacy notice. We send marketing only if you opt in."],
];

export default function FaqsPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22, maxWidth: 860 }}>
        <div>
          <div className="eyebrow">Resources and FAQs</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Answers before you enrol</h1>
        </div>
        <PlaceholderNote />
        <div className="modlist">
          {FAQS.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary><span>{q}</span></summary>
              <p className="muted" style={{ padding: "0 16px 14px" }}>{a}</p>
            </details>
          ))}
        </div>
        <p className="muted">Still have a question? <Link href="/contact">Contact us</Link> or read the <Link href="/privacy">privacy notice</Link>.</p>
      </div>
    </section>
  );
}
