"use client";

import { useState } from "react";
import { ROLE_HELP, ROLE_LABEL, STAFF_ROLES, WORKSPACE_LABEL, type StaffRole } from "@/lib/roles";
import { setUserRoles } from "./actions";

type Kind = "learner" | "employer" | "staff";

/**
 * Account type and roles for one person. Staff can hold several roles; they switch between
 * the workspaces from their own menu, and "Opens in" is the one they land in.
 */
export default function RoleEditor({
  userId, name, active, granted, company, self,
}: { userId: string; name: string; active: string; granted: StaffRole[]; company: string | null; self: boolean }) {
  const startKind: Kind = active === "learner" ? "learner" : active === "employer" ? "employer" : "staff";
  const [kind, setKind] = useState<Kind>(startKind);
  const [roles, setRoles] = useState<StaffRole[]>(granted.length ? granted : startKind === "staff" ? [active as StaffRole] : []);
  const [opens, setOpens] = useState<string>(startKind === "staff" ? active : "");
  const [open, setOpen] = useState(false);
  const toggle = (r: StaffRole) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : STAFF_ROLES.filter((x) => x === r || cur.includes(x))));
  const opensIn = roles.includes(opens as StaffRole) ? opens : roles[0] ?? "";
  const conflict = roles.includes("facilitator") && roles.includes("moderator");
  const summary = kind === "staff" ? (granted.length ? granted : [active as StaffRole]).map((r) => ROLE_LABEL[r]).join(" · ") : ROLE_LABEL[kind];

  if (!open)
    return (
      <div className="row" style={{ gap: 6, flexWrap: "nowrap", alignItems: "center" }}>
        <span className="small"><b>{summary}</b>{kind === "staff" && granted.length > 1 && <><br /><span className="muted">Now in: {ROLE_LABEL[active as StaffRole]}</span></>}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label={`Change roles for ${name}`}>Change</button>
      </div>
    );

  return (
    <form action={setUserRoles} className="stack role-editor" style={{ gap: 8, minWidth: 230 }} onSubmit={() => setOpen(false)}>
      <input type="hidden" name="user_id" value={userId} />
      <div className="row" style={{ gap: 6 }} role="radiogroup" aria-label="Account type">
        {(["learner", "employer", "staff"] as Kind[]).map((k) => (
          <label key={k} className="small" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <input type="radio" name="kind" value={k} checked={kind === k} disabled={self && k !== "staff"} onChange={() => setKind(k)} />
            {k === "staff" ? "Staff" : ROLE_LABEL[k]}
          </label>
        ))}
      </div>
      {kind === "employer" && <input name="company" defaultValue={company ?? ""} placeholder="Company name" aria-label="Employer company" required />}
      {kind === "staff" && (
        <>
          <fieldset className="stack" style={{ gap: 4, border: 0, padding: 0, margin: 0 }}>
            <legend className="small muted">Roles (tick all that apply)</legend>
            {STAFF_ROLES.map((r) => (
              <label key={r} className="small" title={ROLE_HELP[r]} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" name="roles" value={r} checked={roles.includes(r)} disabled={self && r === "admin"} onChange={() => toggle(r)} />
                {ROLE_LABEL[r]}
              </label>
            ))}
            {self && <input type="hidden" name="roles" value="admin" />}
          </fieldset>
          {roles.length > 1 && !self && (
            <label className="small">
              Opens in{" "}
              <select name="active" value={opensIn} onChange={(e) => setOpens(e.target.value)}>
                {roles.map((r) => <option key={r} value={r}>{WORKSPACE_LABEL[r]}</option>)}
              </select>
            </label>
          )}
          {roles.length === 1 && <input type="hidden" name="active" value={roles[0]} />}
          {roles.length > 1 && <span className="small muted">They can switch between these from their menu.</span>}
          {conflict && <span className="small" style={{ color: "var(--warn, #b45309)" }}>Note: they can't moderate results for courses they teach. Another moderator must review those.</span>}
        </>
      )}
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn-primary btn-sm" disabled={kind === "staff" && !roles.length}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
