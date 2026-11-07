import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div>
          <h4>Study</h4>
          <Link href="/courses">Course catalogue</Link><br />
          <Link href="/online-learning">Online learning</Link><br />
          <Link href="/learnerships">Qualifications &amp; learnerships</Link>
        </div>
        <div>
          <h4>Organisations</h4>
          <Link href="/employers">Training for employers</Link><br />
          <Link href="/venue">Assessment centre &amp; venue hire</Link>
        </div>
        <div>
          <h4>Policies</h4>
          <Link href="/privacy">Privacy notice (POPIA)</Link>
        </div>
        <div>
          <p className="muted small">Platform by S.I.C Growth (Pty) Ltd t/a Cloud Uko. Sample content for evaluation.</p>
        </div>
      </div>
    </footer>
  );
}
