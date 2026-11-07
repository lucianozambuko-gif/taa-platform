import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { getLearningState } from "@/lib/learning";

export const metadata = { title: "Certificate" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

/** Issued only for programmes approved for automatic certificates, once every lesson is complete. */
export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await getLearningState(slug);
  if (!state) redirect(`/login?next=/certificate/${slug}`);
  const { course, enrolled, pct, supabase, user, lessons } = state;
  if (!enrolled) notFound();

  if (!course.certificate_auto || pct < 100) {
    return (
      <section className="block">
        <div className="wrap" style={{ maxWidth: 620 }}>
          <div className="panel stack">
            <h1 style={{ fontSize: "1.6rem" }}>Certificate not available yet</h1>
            <p className="muted">
              {!course.certificate_auto
                ? "This programme's certificate is issued by the Academy after assessment, not automatically online."
                : `Complete every lesson to receive your certificate. You're ${pct}% of the way there.`}
            </p>
            <div><Link className="btn btn-primary" href={course.certificate_auto ? `/learn/${slug}` : "/dashboard"}>{course.certificate_auto ? "Continue learning" : "Back to dashboard"}</Link></div>
          </div>
        </div>
      </section>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: last } = await supabase
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .in("lesson_id", lessons.map((l) => l.id))
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();
  const completed = last ? new Date(last.completed_at) : new Date();
  const certNo = `TAA-${course.code.replace(/^TAA-/, "")}-${user.id.slice(0, 6).toUpperCase()}`;

  return (
    <section className="block cert-page">
      <div className="wrap stack" style={{ gap: 18, maxWidth: 980 }}>
        <div className="row no-print" style={{ justifyContent: "space-between" }}>
          <Link href="/dashboard">← My learning</Link>
          <PrintButton label="Download PDF / print" />
        </div>
        <div className="certificate">
          <div className="cert-inner">
            <div className="cert-brand"><span className="mark">TA</span><span>Training Africa Academy</span></div>
            <p className="cert-eyebrow">Certificate of completion</p>
            <p className="cert-small">This certifies that</p>
            <h1 className="cert-name">{profile?.full_name || user.email}</h1>
            <p className="cert-small">has successfully completed the online course</p>
            <h2 className="cert-course">{course.title}</h2>
            <p className="cert-note">{course.certificate ?? "Certificate of completion (non-accredited)"}</p>
            <div className="cert-foot">
              <div><span>Completed</span><b>{fmt(completed)}</b></div>
              <div><span>Course code</span><b className="mono">{course.code}</b></div>
              <div><span>Certificate no.</span><b className="mono">{certNo}</b></div>
              <div className="cert-sign"><span className="line" /><span>[Authorised signatory]</span></div>
            </div>
          </div>
        </div>
        <p className="small muted no-print">Tip: in the print window choose "Save as PDF" to download the certificate.</p>
      </div>
    </section>
  );
}
