"use client";

import { useActionState } from "react";
import { saveAccount, type AccountState } from "./actions";

type P = { full_name: string | null; phone: string | null; whatsapp_opt_in: boolean; marketing_opt_in: boolean; language: string };

export default function AccountForm({ profile, email }: { profile: P; email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAccount, {});
  return (
    <form action={action} className="panel stack" style={{ gap: 14 }}>
      <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} required /></div>
      <div className="field"><label>Email</label><input value={email} disabled /></div>
      <div className="field"><label htmlFor="phone">Mobile number (for WhatsApp)</label><input id="phone" name="phone" inputMode="tel" defaultValue={profile.phone ?? ""} placeholder="e.g. 082 123 4567" /></div>
      <div className="field">
        <label htmlFor="language">Language</label>
        <select id="language" name="language" defaultValue={profile.language}>
          <option value="en">English</option>
          <option value="zu">isiZulu</option>
          <option value="st">Sesotho</option>
        </select>
      </div>
      <label className="plan-opt"><input type="checkbox" name="whatsapp" defaultChecked={profile.whatsapp_opt_in} /> <span><b>WhatsApp reminders</b><br /><span className="small muted">Lessons left before your certificate, intake dates and payments due. Reply STOP at any time.</span></span></label>
      <label className="plan-opt"><input type="checkbox" name="marketing" defaultChecked={profile.marketing_opt_in} /> <span><b>News and offers</b><br /><span className="small muted">New courses and intakes, no more than twice a month.</span></span></label>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}
