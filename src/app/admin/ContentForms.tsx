"use client";

import { useActionState } from "react";
import type { Announcement, Stat, Testimonial } from "@/lib/siteContent";
import { addRedirect, saveSiteContent, type ContentState } from "./actions";

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
