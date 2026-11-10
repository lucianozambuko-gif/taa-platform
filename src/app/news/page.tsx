import Link from "next/link";
import Photo from "@/components/Photo";
import { listPosts } from "@/lib/posts";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/news");
export const dynamic = "force-dynamic";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [posts, all] = await Promise.all([listPosts(category), category ? listPosts() : Promise.resolve(null)]);
  const categories = [...new Set((all ?? posts).map((p) => p.category))];
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22 }}>
        <div>
          <div className="eyebrow">News, insights and resources</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>News, intakes and advice</h1>
        </div>
        {categories.length > 1 && (
          <div className="row" style={{ gap: 6 }}>
            <Link className={`btn btn-sm ${!category ? "btn-primary" : "btn-ghost"}`} href="/news">All</Link>
            {categories.map((c) => <Link key={c} className={`btn btn-sm ${category === c ? "btn-primary" : "btn-ghost"}`} href={`/news?category=${encodeURIComponent(c)}`}>{c}</Link>)}
          </div>
        )}
        <div className="grid g3">
          {posts.map((p) => (
            <Link key={p.id} href={`/news/${p.slug}`} className={`ccard${p.image_url ? " has-photo" : ""}`}>
              {p.image_url && <div className="photo-cover"><Photo url={p.image_url} alt="" /></div>}
              <span className="badge b-short" style={{ alignSelf: "flex-start" }}>{p.category}</span>
              <h2 style={{ fontSize: "1.15rem" }}>{p.title}</h2>
              {p.summary && <p className="muted small">{p.summary}</p>}
              <span className="small muted">{fmt(p.published_at)}</span>
            </Link>
          ))}
        </div>
        {!posts.length && <p className="muted">No articles yet.</p>}
      </div>
    </section>
  );
}
