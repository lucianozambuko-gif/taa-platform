import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div>
          <h4>Study</h4>
          <Link href="/courses">Course catalogue</Link><br />
          <Link href="/online-learning">Online learning</Link><br />
          <Link href="/learnerships">Qualifications &amp; learnerships</Link><br />
          <Link href="/faqs">Resources &amp; FAQs</Link>
        </div>
        <div>
          <h4>Organisations</h4>
          <Link href="/employers">Training for employers</Link><br />
          <Link href="/venue">Assessment centre &amp; venue hire</Link><br />
          <Link href="/facilitators">Facilitators &amp; approach</Link>
        </div>
        <div>
          <h4>About</h4>
          <Link href="/about">About &amp; accreditations</Link><br />
          <Link href="/news">News &amp; insights</Link><br />
          <Link href="/contact">Contact &amp; locations</Link><br />
          <Link href="/privacy">Privacy notice (POPIA)</Link>
        </div>
        <div>
          <h4>This build</h4>
          <Link href="/site-map">Site map</Link>
          <p className="muted small" style={{ marginTop: 8 }}>Platform by S.I.C Growth (Pty) Ltd t/a Cloud Uko. Sample content for evaluation.</p>
        </div>
      </div>
    </footer>
  );
}
