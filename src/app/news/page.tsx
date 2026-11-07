import Link from "next/link";
import PlaceholderNote from "@/components/PlaceholderNote";

export const metadata = { title: "News and insights" };

export default function NewsPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22 }}>
        <div>
          <div className="eyebrow">News and insights</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>News, intakes and advice</h1>
        </div>
        <PlaceholderNote />
        <div className="grid g3">
          <Link href="/news/sample-article" className="ccard">
            <span className="badge b-short" style={{ alignSelf: "flex-start" }}>Employers</span>
            <h3>Five signs your cleaning team needs refresher training</h3>
            <p className="muted small">What supervisors can watch for, and how short skills courses help.</p>
            <span className="small muted">Sample article</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
