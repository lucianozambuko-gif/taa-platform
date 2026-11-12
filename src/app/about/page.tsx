import PageHero from "@/components/PageHero";
import Link from "next/link";
import PlaceholderNote from "@/components/PlaceholderNote";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/about");

const ROWS: [string, string, string][] = [
  ["Accrediting body", "[To be supplied]", "Per current approval letter"],
  ["Accreditation number", "[To be supplied]", "Per current approval letter"],
  ["Approved qualifications and skills programmes", "[To be supplied]", "Listed exactly as approved"],
  ["Assessment centre scope", "[To be supplied]", "Listed exactly as approved"],
];

export default function AboutPage() {
  return (
    <>
    <PageHero eyebrow="About the Academy" title={<>Practical skills training for work in South Africa</>} photo="taa-staff-1"><p>Training Africa Academy trains individuals and workplace teams through short skills courses, accredited programmes and learnerships, in our Johannesburg centre, at your workplace and online.</p></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22 }}>
        <div>
        </div>
        <PlaceholderNote />
        <div className="grid g3">
          <div className="panel stack"><h3>Practical first</h3><p className="muted">Hands-on practicals and workplace experience where a programme requires them. Online learning prepares you; it does not replace them.</p></div>
          <div className="panel stack"><h3>Clear and honest</h3><p className="muted">Prices, entry requirements and accreditation status are shown on every course page before you enrol.</p></div>
          <div className="panel stack"><h3>Built for employers</h3><p className="muted">Group pricing, on-site delivery and progress updates for HR and L&amp;D teams.</p></div>
        </div>
        <div className="stack">
          <h2 style={{ fontSize: "1.4rem" }}>Accreditations</h2>
          <p className="muted" style={{ maxWidth: "62ch" }}>Every accreditation claim on this website is checked against the Academy's current approval letters before it is published.</p>
          <div className="panel tscroll" tabIndex={0} style={{ padding: "6px 10px" }}>
            <table className="tbl">
              <thead><tr><th>Item</th><th>Detail</th><th>Source</th></tr></thead>
              <tbody>{ROWS.map(([a, b, c]) => <tr key={a}><td><b>{a}</b></td><td className="tbc">{b}</td><td className="muted">{c}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="row"><Link className="btn btn-primary" href="/courses">Find a course</Link><Link className="btn btn-ghost" href="/contact">Contact us</Link></div>
      </div>
    </section>
    </>
  );
}
