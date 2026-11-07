import { getSiteContent } from "@/lib/siteContent";
import { RedirectForm, SiteContentForm } from "../ContentForms";
import { deleteRedirect } from "../actions";
import type { DB } from "./shared";

/** RFQ F02 editable content and F12/F13 redirects for old URLs. */
export default async function SiteContentTab({ supabase }: { supabase: DB }) {
  const [content, { data: redirects }] = await Promise.all([getSiteContent(), supabase.from("redirects").select("*").order("from_path")]);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <SiteContentForm {...content} />
      <div className="panel stack" style={{ gap: 12 }}>
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
