import Link from "next/link";
import { getSiteContent } from "@/lib/siteContent";
import { SEO_PAGES, getSeoOverrides } from "@/lib/seo";
import { FaqForm, RedirectForm, SeoForm, SiteContentForm } from "../ContentForms";
import { deleteRedirect } from "../actions";
import type { DB } from "./shared";

/** RFQ F02 editable content and F12/F13 redirects for old URLs. */
export default async function SiteContentTab({ supabase }: { supabase: DB }) {
  const [content, { data: redirects }, { data: posts }, { data: faqRow }, seo] = await Promise.all([
    getSiteContent(),
    supabase.from("redirects").select("*").order("from_path"),
    supabase.from("posts").select("id, title, slug, category, published, published_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("site_content").select("value").eq("key", "faqs").maybeSingle(),
    getSeoOverrides(),
  ]);
  const faqs = Array.isArray(faqRow?.value) ? (faqRow.value as { q: string; a: string }[]) : [];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <nav className="row" style={{ gap: 6 }} aria-label="Jump to">
        {[["#news", "News & resources"], ["#home", "Homepage & announcement"], ["#faqs", "FAQs"], ["#seo", "Page titles (SEO)"], ["#redirects", "Redirects"]].map(([h, l]) => <a key={h} className="btn btn-ghost btn-sm" href={h}>{l}</a>)}
      </nav>
      <div className="panel stack" style={{ gap: 12 }} id="news">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>News, insights and resources</h3>
          <Link className="btn btn-primary btn-sm" href="/admin/posts/new">New article</Link>
        </div>
        <div className="tscroll">
          <table className="tbl">
            <thead><tr><th>Article</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {(posts ?? []).map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/posts/${p.id}`}><b>{p.title}</b></Link><br /><span className="mono small muted">/news/{p.slug}</span></td>
                  <td>{p.category}</td>
                  <td><span className={`badge ${p.published ? "b-good" : "b-warn"}`}>{p.published ? "Published" : "Draft"}</span></td>
                  <td className="small">{new Date(p.updated_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
              {!(posts ?? []).length && <tr><td colSpan={4} className="muted">No articles yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div id="home"><SiteContentForm {...content} /></div>
      <div className="panel stack" style={{ gap: 10 }} id="faqs">
        <h3>Resources and FAQs page</h3>
        <FaqForm text={faqs.map((f) => `Q: ${f.q}\n${f.a}`).join("\n\n")} />
      </div>
      <div className="panel stack" style={{ gap: 10 }} id="seo">
        <h3>Page titles and search descriptions</h3>
        <SeoForm pages={SEO_PAGES} overrides={seo} />
      </div>
      <div className="panel stack" style={{ gap: 12 }} id="redirects">
        <h3>Redirects from the old website</h3>
        <p className="small muted">When the new site goes live, old links from Google, adverts and emails keep working by sending visitors to the right new page (permanent 301 redirect).</p>
        <RedirectForm />
        <div className="tscroll">
          <table className="tbl">
            <thead><tr><th>Old page</th><th>New page</th><th>Used</th><th></th></tr></thead>
            <tbody>
              {(redirects ?? []).map((r) => (
                <tr key={r.from_path}>
                  <td className="mono small">{r.from_path}</td>
                  <td className="mono small">{r.to_path}</td>
                  <td className="tnum">{r.hits}</td>
                  <td><form action={deleteRedirect}><input type="hidden" name="from_path" value={r.from_path} /><button className="btn btn-ghost btn-sm">Remove</button></form></td>
                </tr>
              ))}
              {!(redirects ?? []).length && <tr><td colSpan={4} className="muted">No redirects yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
