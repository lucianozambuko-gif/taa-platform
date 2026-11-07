"use client";

import { useActionState } from "react";
import { submitLead, type LeadState } from "@/app/leads/actions";

type Props = {
  type: "course_enquiry" | "group_quote" | "learnership" | "venue" | "multi_learner";
  source: string;
  submitLabel: string;
  successTitle: string;
  /** Use {team} where the routed team name should appear. */
  successText: string;
  children: React.ReactNode;
};

/** Wraps any enquiry form: consent checkbox, validation message and a confirmation with the reference number. */
export default function LeadForm({ type, source, submitLabel, successTitle, successText, children }: Props) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});
  if (state.ok)
    return (
      <div className="panel stack" style={{ gap: 12 }}>
        <span className="badge b-good" style={{ alignSelf: "flex-start" }}>Received</span>
        <h3>{successTitle}</h3>
        <p className="muted">
          Your reference is <b className="mono">{state.ref}</b>. {successText.replace("{team}", state.routedTo ?? "our team")}
        </p>
      </div>
    );
  return (
    <form action={action} className="panel stack" style={{ gap: 14 }}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="source" value={source} />
      {children}
      <label className="check">
        <input type="checkbox" name="popia" required />
        <span>I agree that Training Africa Academy may contact me about this request, as described in the privacy notice.</span>
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : submitLabel}</button></div>
    </form>
  );
}
