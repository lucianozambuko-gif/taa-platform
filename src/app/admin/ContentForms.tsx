"use client";

import { useActionState } from "react";
import type { Announcement, Stat, Testimonial } from "@/lib/siteContent";
import { addRedirect, purgeOldLeads, saveDutyRoster, saveFaqs, saveSeo, saveSiteContent, type ContentState } from "./actions";
import { TEAM_LABEL, type Duty, type DutyTeam } from "@/lib/dutyTeams";

export function SiteContentForm({ stats, testimonials, announcement, sample }: { stats: Stat[]; testimonials: Testimonial[]; announcement: Announcement; sample: boolean }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveSiteContent, {});
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <div className="panel stack" style={{ gap: 10 }}>
        <h3>Announcement bar</h3>
        <p className="small muted">A short message across the top of every page, e.g. a new intake or a closing date.</p>
        <div className="grid g2" style={{ gap: 10 }}>
          <div className="field"><label>Message</label><input name="ann_text" maxLength={160} defaultValue={announcement.text} placeholder="e.g. January intakes now open" /></div>
          <div className="field"><label>Link (optional)</label><input name="ann_link" defaultValue={announcement.link} placeholder="/courses" /></div>
        </div>
        <label className="small"><input type="checkbox" name="ann_on" defaultChecked={announcement.on} /> Show the announcement</label>
      </div>
      <div className="panel stack" style={{ gap: 10 }}>
        <h3>Homepage figures</h3>
        <div className="grid g2" style={{ gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <div className="field" style={{ flex: "0 0 110px" }}><label>Figure {i + 1}</label><input name={`stat_value_${i}`} defaultValue={stats[i]?.value ?? ""} /></div>
              <div className="field" style={{ flex: 1 }}><label>Label</label><input name={`stat_label_${i}`} defaultValue={stats[i]?.label ?? ""} /></div>
            </div>
          ))}
        </div>
        <label className="small"><input type="checkbox" name="sample_figures" defaultChecked={sample} /> Show &quot;Sample figures&quot; label (untick once real figures are approved)</label>
      </div>
      <div className="panel stack" style={{ gap: 10 }}>
        <h3>Testimonials</h3>
        <p className="small muted">Only publish testimonials you have permission to use.</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid g3" style={{ gap: 10 }}>
            <div className="field" style={{ gridColumn: "span 3" }}><label>Quote {i + 1}</label><input name={`t_quote_${i}`} defaultValue={testimonials[i]?.quote ?? ""} /></div>
            <div className="field"><label>Name</label><input name={`t_name_${i}`} defaultValue={testimonials[i]?.name ?? ""} /></div>
            <div className="field" style={{ gridColumn: "span 2" }}><label>Role and place</label><input name={`t_role_${i}`} defaultValue={testimonials[i]?.role ?? ""} /></div>
          </div>
        ))}
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save and publish"}</button></div>
    </form>
  );
}

export function RedirectForm() {
  const [state, action, pending] = useActionState<ContentState, FormData>(addRedirect, {});
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <div className="grid g2" style={{ gap: 10 }}>
        <div className="field"><label>Old page (path or full old URL)</label><input name="from_path" required placeholder="/old-courses-page" /></div>
        <div className="field"><label>Send visitors to</label><input name="to_path" required placeholder="/courses" /></div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Add redirect"}</button></div>
    </form>
  );
}

export function FaqForm({ text }: { text: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveFaqs, {});
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <textarea name="faqs" rows={14} defaultValue={text} style={{ fontSize: ".9rem" }} />
      <span className="small muted">Write each question on a line starting with Q:, the answer underneath, and a blank line before the next question.</span>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save FAQs"}</button></div>
    </form>
  );
}

export function SeoForm({ pages, overrides }: { pages: { path: string; title: string; description: string }[]; overrides: Record<string, { title?: string; description?: string }> }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveSeo, {});
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      {pages.map((p) => (
        <details key={p.path} className="card" style={{ padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer" }}><span className="mono small">{p.path}</span> · <b>{overrides[p.path]?.title || p.title}</b></summary>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <div className="field"><label>Page title (up to 60 characters)</label><input name={`title::${p.path}`} maxLength={70} defaultValue={overrides[p.path]?.title ?? ""} placeholder={p.title} /></div>
            <div className="field"><label>Search description (up to 160 characters)</label><input name={`description::${p.path}`} maxLength={300} defaultValue={overrides[p.path]?.description ?? ""} placeholder={p.description} /></div>
          </div>
        </details>
      ))}
      <span className="small muted">Leave a field empty to use the default shown in grey. Course and article pages have their own title and description fields.</span>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save page titles"}</button></div>
    </form>
  );
}

export function RetentionForm() {
  const [state, action, pending] = useActionState<ContentState, FormData>(purgeOldLeads, {});
  return (
    <form action={action} className="row" style={{ gap: 8, alignItems: "end" }}>
      <div className="field" style={{ flex: "0 1 220px" }}>
        <label>Closed enquiries older than</label>
        <select name="months" defaultValue="24"><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option></select>
      </div>
      <button className="btn btn-ghost btn-sm" disabled={pending}>{pending ? "Working…" : "Remove personal details"}</button>
      {state.error && <p className="form-error small">{state.error}</p>}
      {state.message && <p className="form-ok small">{state.message}</p>}
    </form>
  );
}

/** Who answers each WhatsApp button on the site. Empty or switched-off slots go to the Academy's main number. */
export function DutyRosterForm({ duty }: { duty: Partial<Duty> }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveDutyRoster, {});
  return (
    <details className="panel">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>WhatsApp duty roster: who answers each chat button</summary>
      <form action={action} className="stack" style={{ gap: 10, marginTop: 12 }}>
        <p className="small muted">Course pages go to the course advisor, the learnership checker to admissions, and the help button to learner support. When a slot is off, chats go to the Academy’s main WhatsApp number.</p>
        {(Object.keys(TEAM_LABEL) as DutyTeam[]).map((team) => (
          <div key={team} className="row" style={{ gap: 8, alignItems: "end" }}>
            <div className="field" style={{ flex: "1 1 160px" }}><label>{TEAM_LABEL[team]}: name</label><input name={`${team}_name`} defaultValue={duty[team]?.name ?? ""} placeholder="e.g. Thandi" /></div>
            <div className="field" style={{ flex: "1 1 160px" }}><label>WhatsApp number</label><input name={`${team}_phone`} inputMode="tel" defaultValue={duty[team]?.phone ?? ""} placeholder="082 123 4567" /></div>
            <label className="small" style={{ paddingBottom: 10 }}><input type="checkbox" name={`${team}_on`} defaultChecked={duty[team]?.on ?? false} /> On duty</label>
          </div>
        ))}
        {state.error && <p className="notice" role="alert">{state.error}</p>}
        {state.message && <p className="notice ok" role="status">{state.message}</p>}
        <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save roster"}</button></div>
      </form>
    </details>
  );
}
