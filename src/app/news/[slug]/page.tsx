import Link from "next/link";
import Photo from "@/components/Photo";
import SimpleText from "@/components/SimpleText";
import { getPost } from "@/lib/posts";
import { redirectOrNotFound } from "@/lib/redirects";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Article" };
  const description = post.meta_description || post.summary || undefined;
  return { title: post.title, description, alternates: { canonical: `/news/${post.slug}` }, openGraph: { title: post.title, description, type: "article", url: `/news/${post.slug}`, ...(post.image_url ? { images: [post.image_url] } : {}) } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return redirectOrNotFound(`/news/${slug}`);
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, ...(post.image_url ? { image: post.image_url } : {}), datePublished: post.published_at, dateModified: post.updated_at, publisher: { "@type": "EducationalOrganization", name: "Training Africa Academy" } };
  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="wrap stack" style={{ gap: 16, maxWidth: 760 }}>
        <div className="crumbs"><Link href="/news">News</Link><span>/</span><span>{post.category}</span></div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.5rem)" }}>{post.title}</h1>
        <p className="small muted">{post.published_at ? new Date(post.published_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : ""}</p>
        {post.summary && <p className="lead">{post.summary}</p>}
        {post.image_url && <Photo url={post.image_url} alt={post.image_alt ?? ""} className="photo-wide" sizes="(max-width: 860px) 100vw, 760px" eager />}
        <SimpleText text={post.body} />
        {post.cta_label && post.cta_link && (
          <div className="panel row" style={{ justifyContent: "space-between" }}>
            <span>Ready for the next step?</span>
            <Link className="btn btn-primary" href={post.cta_link}>{post.cta_label}</Link>
          </div>
        )}
      </article>
    </section>
  );
}
