import { LEAD_LABEL } from "@/lib/format";
import { anonymiseLead, updateLead } from "../actions";
import BulkEnrolForm from "../BulkEnrolForm";
import { DutyRosterForm } from "../ContentForms";
import { getDuty } from "@/lib/duty";
import { type DB, SELECT, waLink, when } from "./shared";

const STATUS_BADGE: Record<string, string> = { new: "b-warn", contacted: "b-short", quoted: "b-short", won: "b-good", lost: "b-bad" };

/** Every enquiry with owner, status and notes. Sales staff can filter to their own leads. */
export default async function LeadsTab({ supabase, userId, sp, isAdmin }: { supabase: DB; userId: string; sp: Record<string, string | undefined>; isAdmin: boolean }) {
  const [{ data: leads }, { data: staff }, { data: courseList }, duty] = await Promise.all([
    supabase.from("leads").select("*, courses(title)").order("created_at", { ascending: false }).limit(300),
    supabase.rpc("staff_directory"),
    supabase.from("courses").select("id, title").order("title"),
    getDuty(),
  ]);
  const people = (staff ?? []) as { id: string; full_name: string | null; role: string }[];
  const nameOf = new Map(people.map((p) => [p.id, p.full_name ?? "Staff"]));
  const view = sp.view ?? "open";
  const all = leads ?? [];
  const list = all.filter((l) =>
    view === "mine" ? l.assigned_to === userId : view === "unassigned" ? !l.assigned_to && !["won", "lost"].includes(l.status) : view === "closed" ? ["won", "lost"].includes(l.status) : view === "all" ? true : !["won", "lost"].includes(l.status),
  );
  const VIEWS: [string, string, number][] = [
    ["open", "Open", all.filter((l) => !["won", "lost"].includes(l.status)).length],
    ["mine", "Assigned to me", all.filter((l) => l.assigned_to === userId).length],
    ["unassigned", "Unassigned", all.filter((l) => !l.assigned_to && !["won", "lost"].includes(l.status)).length],
    ["closed", "Won / lost", all.filter((l) => ["won", "lost"].includes(l.status)).length],
    ["all", "All", all.length],
  ];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <DutyRosterForm duty={duty} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 6 }}>
          {VIEWS.map(([k, label, n]) => (
            <a key={k} href={`/admin?tab=leads&view=${k}`} className={`btn btn-sm ${view === k ? "btn-primary" : "btn-ghost"}`}>{label} <span className="tnum">({n})</span></a>
          ))}
        </div>
        <a className="btn btn-ghost btn-sm" href="/admin/export/leads">Download CSV</a>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {list.map((l) => {
          const d = (l.details ?? {}) as Record<string, string>;
          const wa = waLink(l.phone, `Hi ${l.name.split(" ")[0]}, this is Training Africa Academy following up on your ${(LEAD_LABEL[l.type] ?? "enquiry").toLowerCase()} (${l.ref}).`);
          return (
            <div key={l.id} className="panel lead-card">

              <div className="lead-head">
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="mono small">{l.ref}</span>
                    <span className={`badge ${STATUS_BADGE[l.status] ?? "b-short"}`}>{l.status}</span>
                    <span className="small muted">{LEAD_LABEL[l.type] ?? l.type} · {when(l.created_at)}</span>
                  </div>
                  <h3 style={{ marginTop: 6 }}>{l.name}{l.company ? <span className="muted" style={{ fontWeight: 500 }}> · {l.company}</span> : null}</h3>
                  <p className="small muted">
                    {[l.email, l.phone].filter(Boolean).join(" · ")}
                    {(l.courses as { title: string } | null)?.title ? ` · Course: ${(l.courses as { title: string }).title}` : ""}
                    {l.staff_count ? ` · ${l.staff_count} people` : ""}
                  </p>
                  <p className="small" style={{ marginTop: 4 }}>
                    <span className="muted">Source:</span> {l.source} · <span className="muted">Routed to:</span> {l.routed_to}
                    {Object.entries(d).filter(([, v]) => v).map(([k, v]) => <span key={k}> · <span className="muted">{k}:</span> {v}</span>)}
                  </p>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {wa && <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener">WhatsApp</a>}
                  {l.email && <a className="btn btn-ghost btn-sm" href={`mailto:${l.email}?subject=${encodeURIComponent(`Your enquiry ${l.ref}`)}`}>Email</a>}
                </div>
              </div>
              <form action={updateLead} className="lead-edit">
                <input type="hidden" name="id" value={l.id} />
                <label className="small">Owner
                  <select name="assigned_to" defaultValue={l.assigned_to ?? ""} style={SELECT}>
                    <option value="">Unassigned ({l.routed_to})</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? "Staff"}{p.id === userId ? " (me)" : ""}</option>)}
                  </select>
                </label>
                <label className="small">Status
                  <select name="status" defaultValue={l.status} style={SELECT}>
                    {["new", "contacted", "quoted", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="small" style={{ flex: "1 1 260px" }}>Notes
                  <input name="notes" defaultValue={l.notes ?? ""} placeholder="e.g. Called, sending quote Friday" style={{ ...SELECT, width: "100%" }} />
                </label>
                <button className="btn btn-primary btn-sm">Save</button>
                {isAdmin && !l.name.startsWith("Removed") && <button formAction={anonymiseLead} className="btn btn-ghost btn-sm" title="POPIA request: remove this person's details">Remove personal data</button>}
              </form>
              {l.type === "multi_learner" && d.learners && l.status !== "won" && (
                <details>
                  <summary className="btn btn-ghost btn-sm" style={{ display: "inline-flex" }}>Enrol the {String(d.learners).split("\n").filter((x) => x.trim()).length} learners on this list</summary>
                  <div style={{ marginTop: 10 }}>
                    <BulkEnrolForm courses={courseList ?? []} preset={{ courseId: l.course_id ?? undefined, company: l.company ?? undefined, learners: String(d.learners), leadId: l.id }} />
                  </div>
                </details>
              )}
              {l.assigned_to && <p className="small muted">Owner: {nameOf.get(l.assigned_to) ?? "Staff"}{l.updated_at ? ` · updated ${when(l.updated_at)}` : ""}</p>}
            </div>
          );
        })}
        {!list.length && <div className="panel muted">No leads in this view.</div>}
      </div>
    </div>
  );
}
