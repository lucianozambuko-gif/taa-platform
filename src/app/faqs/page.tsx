import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/faqs");

const FALLBACK: { q: string; a: string }[] = [
  { q: "How do I enrol and pay?", a: "Open the course page, click Enrol and pay, create your learner account and pay by card or Instant EFT." },
];

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  let FAQS = FALLBACK;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("value").eq("key", "faqs").maybeSingle();
    if (Array.isArray(data?.value) && data.value.length) FAQS = data.value as typeof FALLBACK;
  } catch {}
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22, maxWidth: 860 }}>
        <div>
          <div className="eyebrow">Resources and FAQs</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Answers before you enrol</h1>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <div className="modlist">
          {FAQS.map(({ q, a }, i) => (
            <details key={q} open={i === 0}>
              <summary><span>{q}</span></summary>
              <p className="muted" style={{ padding: "0 16px 14px" }}>{a}</p>
            </details>
          ))}
        </div>
        <p className="muted">Still have a question? <Link href="/contact">Contact us</Link> or read the <Link href="/privacy">privacy notice</Link> and <Link href="/terms">terms and learner policies</Link>.</p>
      </div>
    </section>
  );
}
