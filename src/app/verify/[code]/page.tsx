import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Certificate verification", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Public check that a certificate is genuine. Shows only name, course and date. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { code: decodeURIComponent(code) });
  const cert = (data ?? [])[0] as { learner: string; course: string; course_code: string; kind: string; issued: string; certificate_type: string } | undefined;
  return (
    <section className="block">
      <div className="wrap stack" style={{ maxWidth: 620, gap: 14 }}>
        <div className="eyebrow">Training Africa Academy · Certificate verification</div>
        {cert ? (
          <div className="panel stack" style={{ gap: 10, borderColor: "var(--good)" }}>
            <span className="badge b-good" style={{ alignSelf: "flex-start" }}>Genuine</span>
            <h1 style={{ fontSize: "1.8rem" }}>{cert.learner}</h1>
            <p>{cert.certificate_type} for <b>{cert.course}</b> <span className="mono small muted">({cert.course_code})</span></p>
            <p className="muted">Issued {cert.issued ? new Date(cert.issued).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : ""} · Certificate number <span className="mono">{decodeURIComponent(code).toUpperCase()}</span></p>
            {cert.kind !== "short" && <p className="small muted">For accredited programmes, the official certificate is issued by the accrediting body.</p>}
          </div>
        ) : (
          <div className="panel stack" style={{ gap: 10 }}>
            <span className="badge b-bad" style={{ alignSelf: "flex-start" }}>Not found</span>
            <h1 style={{ fontSize: "1.6rem" }}>We couldn&apos;t verify this certificate</h1>
            <p className="muted">Check the number and try again, or contact the Academy to confirm a learner&apos;s results.</p>
            <div className="row" style={{ gap: 8 }}><Link className="btn btn-ghost" href="/verify">Try another number</Link><Link className="btn btn-ghost" href="/contact">Contact us</Link></div>
          </div>
        )}
      </div>
    </section>
  );
}
