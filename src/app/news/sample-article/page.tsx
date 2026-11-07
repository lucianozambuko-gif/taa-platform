import Link from "next/link";
import PlaceholderNote from "@/components/PlaceholderNote";

export const metadata = { title: "Five signs your cleaning team needs refresher training" };

const POINTS: [string, string][] = [
  ["Chemicals are mixed by eye", "Guessing dilutions wastes stock and can be unsafe. Staff should read the label and measure every time."],
  ["Colour-coding has slipped", "When the same cloth cleans a washroom and a kitchen, cross-contamination follows."],
  ["Floors look clean but feel sticky", "Usually a sign of too much product or the wrong method for the floor type."],
  ["Equipment breaks often", "Poor care shortens equipment life. Short daily checks prevent most faults."],
  ["Complaints are rising", "Customers notice standards dropping before managers do."],
];

export default function SampleArticle() {
  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <article className="wrap stack" style={{ gap: 18, maxWidth: 760 }}>
        <div className="crumbs"><Link href="/news">News</Link><span>/</span><span>Article</span></div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.5rem)" }}>Five signs your cleaning team needs refresher training</h1>
        <PlaceholderNote />
        {POINTS.map(([h, p], i) => (
          <div key={h} className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.2rem" }}>{i + 1}. {h}</h2>
            <p className="muted">{p}</p>
          </div>
        ))}
        <div className="panel row" style={{ justifyContent: "space-between" }}>
          <span>Refresh your team's skills with a one-day practical course.</span>
          <Link className="btn btn-primary" href="/courses/professional-cleaning-practices">View the course</Link>
        </div>
      </article>
    </section>
  );
}
