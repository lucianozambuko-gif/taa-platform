import Link from "next/link";
import { redirect } from "next/navigation";
import Workspace from "@/components/Workspace";
import { WorkHead } from "@/components/WorkBits";
import { homeFor } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";
import LinkBuilder from "./LinkBuilder";

export const metadata = { title: "Campaigns", robots: { index: false } };
export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = { website: "Website forms", employers_page: "Employers page", employer_portal: "Employer portal", venue_page: "Venue page", course_page: "Course pages", advisor: "Advisor chat", whatsapp: "WhatsApp" };
const nice = (s: string) => SOURCE_LABEL[s] ?? (s.startsWith("campaign") ? `Campaign · ${s.split(":").slice(1).join(" · ") || "untagged"}` : s.replace(/_/g, " "));

/** Staff view of the reusable campaign landing pages (RFQ section 8) and where enquiries come from (F08 lead attribution). */
export default async function Campaigns() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/campaigns");
  const role = profile?.role ?? "learner";
  if (!["sales", "content", "admin"].includes(role)) redirect(role === "learner" ? "/courses" : homeFor(role));
  const seesLeads = role !== "content";
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const [{ data: courses }, { data: leads }] = await Promise.all([
    supabase.from("courses").select("slug, title").eq("published", true).order("title"),
    seesLeads ? supabase.from("leads").select("source, status, created_at").gte("created_at", since).limit(1000) : Promise.resolve({ data: [] as { source: string | null; status: string; created_at: string }[] }),
  ]);
  const bySource = new Map<string, { n: number; won: number; open: number }>();
  for (const l of leads ?? []) {
    const k = l.source || "website";
    const r = bySource.get(k) ?? { n: 0, won: 0, open: 0 };
    r.n++;
    if (l.status === "won") r.won++;
    if (!["won", "lost"].includes(l.status)) r.open++;
    bySource.set(k, r);
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1].n - a[1].n);
  const max = Math.max(1, ...sources.map(([, r]) => r.n));
  const campaignLeads = sources.filter(([k]) => k.startsWith("campaign")).reduce((a, [, r]) => a + r.n, 0);

  return (
    <Workspace>
      <WorkHead eyebrow={role === "content" ? "Content studio" : "Sales & admissions desk"} title="Campaigns" />
      <div className="panel stack" style={{ gap: 12 }}>
        <h2 className="h3">Build a campaign link</h2>
        <p className="small muted" style={{ margin: 0 }}>Every published course has a ready-made landing page with one message and one enquiry form. Use a link from here in adverts, emails and WhatsApp broadcasts so each enquiry shows where it came from.</p>
        <LinkBuilder courses={courses ?? []} />
      </div>
      {seesLeads && (
        <div className="panel stack" style={{ gap: 8 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h3">Where enquiries come from</h2>
            <span className="small muted">Last 90 days · {campaignLeads} from campaign links</span>
          </div>
          <div className="tscroll" tabIndex={0}>
            <table className="tbl">
              <thead><tr><th>Source</th><th>Enquiries</th><th></th><th>Still open</th><th>Won</th></tr></thead>
              <tbody>
                {sources.map(([k, r]) => (
                  <tr key={k}>
                    <td>{nice(k)}{k.startsWith("campaign") && <> <span className="badge b-acc">Campaign</span></>}</td>
                    <td className="tnum">{r.n}</td>
                    <td style={{ minWidth: 120 }}><div className="bar"><i style={{ width: `${(r.n / max) * 100}%` }} /></div></td>
                    <td className="tnum">{r.open}</td>
                    <td className="tnum">{r.won}{r.n ? <span className="small muted"> · {Math.round((r.won / r.n) * 100)}%</span> : null}</td>
                  </tr>
                ))}
                {!sources.length && <tr><td colSpan={5} className="muted">No enquiries in the last 90 days.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Brochure downloads, WhatsApp clicks and checkout figures are in <Link href="/admin?tab=overview">Reports</Link>.</p>
        </div>
      )}
      <div className="panel stack" style={{ gap: 4 }}>
        <h2 className="h3">Campaign pages</h2>
        {(courses ?? []).map((c) => (
          <div className="todo" key={c.slug}>
            <span style={{ minWidth: 0 }}><b>{c.title}</b><br /><span className="mono small muted">/campaigns/{c.slug}</span></span>
            <a className="btn btn-ghost btn-sm" href={`/campaigns/${c.slug}`} target="_blank" rel="noopener">Preview</a>
          </div>
        ))}
        {!(courses ?? []).length && <p className="small muted">No published courses yet.</p>}
      </div>
    </Workspace>
  );
}
