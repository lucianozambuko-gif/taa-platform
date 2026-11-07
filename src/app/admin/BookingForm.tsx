"use client";

import { useActionState } from "react";
import { ROOMS } from "@/lib/roles";
import { saveBooking, type VenueState } from "./actions";

type Prefill = { room?: string; date?: string; slot?: string; client?: string; leadId?: string; note?: string };

export default function BookingForm({ prefill = {}, title, compact = false }: { prefill?: Prefill; title?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<VenueState, FormData>(saveBooking, {});
  const room = ROOMS.find(([r]) => prefill.room && r.toLowerCase() === prefill.room.toLowerCase())?.[0] ?? ROOMS[0][0];
  return (
    <form action={action} className={compact ? "stack" : "panel stack"} style={{ gap: 10 }}>
      {title && <h3>{title}</h3>}
      {prefill.leadId && <input type="hidden" name="lead_id" value={prefill.leadId} />}
      <div className="grid g3" style={{ gap: 10 }}>
        <div className="field"><label>Room</label><select name="room" defaultValue={room}>{ROOMS.map(([r]) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label>Date</label><input name="date" type="date" required defaultValue={prefill.date ?? ""} /></div>
        <div className="field"><label>Time</label><select name="slot" defaultValue={prefill.slot ?? "full"}><option value="full">Full day</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></div>
        <div className="field"><label>Client</label><input name="client" defaultValue={prefill.client ?? ""} placeholder="Who is it for?" /></div>
        <div className="field"><label>Status</label><select name="status" defaultValue="confirmed"><option value="confirmed">Confirmed</option><option value="held">Provisional hold</option><option value="blocked">Blocked (maintenance / internal)</option></select></div>
        <div className="field"><label>Note</label><input name="note" defaultValue={prefill.note ?? ""} placeholder="Optional" /></div>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : prefill.leadId ? "Confirm booking" : "Save to calendar"}</button></div>
    </form>
  );
}
