import VenueCalendar from "@/components/VenueCalendar";
import BookingForm from "../BookingForm";
import { declineVenueRequest, updateBooking } from "../actions";
import { type DB, day, when } from "./shared";

/** Booking requests, the availability calendar and the confirmation workflow (RFQ F10). */
export default async function VenueTab({ supabase, sp }: { supabase: DB; sp: Record<string, string | undefined> }) {
  const weeks = Math.max(0, Math.min(26, Number(sp.week ?? 0) || 0));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setTime(start.getTime() + weeks * 7 * 864e5);
  const end = new Date(start.getTime() + 27 * 864e5);
  const [{ data: requests }, { data: bookings }] = await Promise.all([
    supabase.from("leads").select("id, ref, name, company, phone, email, details, created_at, status").eq("type", "venue").not("status", "in", "(won,lost)").order("created_at"),
    supabase.from("venue_bookings").select("*").gte("date", start.toISOString().slice(0, 10)).lte("date", end.toISOString().slice(0, 10)).order("date"),
  ]);
  const heldFor = new Set((bookings ?? []).map((b) => b.lead_id).filter(Boolean));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="panel stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Booking requests waiting for a decision ({(requests ?? []).length})</h3>
          <a className="small" href="/venue" target="_blank">See the public venue page →</a>
        </div>
        {(requests ?? []).map((r) => {
          const d = (r.details ?? {}) as Record<string, string>;
          return (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <span className="mono small">{r.ref}</span> <span className="small muted">· received {when(r.created_at)}</span>
                  <h4 style={{ margin: "4px 0" }}>{r.name}{r.company ? ` · ${r.company}` : ""}</h4>
                  <p className="small muted">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                  <p className="small">Asked for: <b>{d.room ?? "Any room"}</b> on <b>{d.date ? day(d.date) : "a date to agree"}</b>{d.slot && d.slot !== "full" ? ` (${d.slot})` : ""}{d.purpose ? ` · ${d.purpose}` : ""}</p>
                </div>
                {heldFor.has(r.id) && <span className="badge b-warn">Provisionally held</span>}
              </div>
              <details style={{ marginTop: 10 }}>
                <summary className="btn btn-primary btn-sm" style={{ display: "inline-flex" }}>Confirm or hold a room</summary>
                <div style={{ marginTop: 10 }}>
                  <BookingForm compact prefill={{ room: d.room, date: d.date, slot: d.slot, client: r.company ?? r.name, leadId: r.id, note: d.purpose }} />
                </div>
              </details>
              <form action={declineVenueRequest} className="row" style={{ gap: 6, marginTop: 8 }}>
                <input type="hidden" name="lead_id" value={r.id} />
                <input name="reason" placeholder="Reason (e.g. fully booked)" style={{ padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)", flex: "1 1 200px" }} />
                <button className="btn btn-ghost btn-sm">Decline</button>
              </form>
            </div>
          );
        })}
        {!(requests ?? []).length && <p className="muted small">No open requests. New requests from the venue page appear here.</p>}
      </div>

      <div className="panel stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Availability: {day(start.toISOString())} to {day(end.toISOString())}</h3>
          <div className="row" style={{ gap: 6 }}>
            {weeks > 0 && <a className="btn btn-ghost btn-sm" href={`/admin?tab=venue&week=${weeks - 1}`}>← Earlier</a>}
            <a className="btn btn-ghost btn-sm" href={`/admin?tab=venue&week=${weeks + 1}`}>Later →</a>
          </div>
        </div>
        <VenueCalendar busy={(bookings ?? []).map((b) => ({ room: b.room, date: b.date, slot: b.slot, status: b.status, client: b.client }))} start={start} days={28} detailed />
      </div>

      <BookingForm title="Add a booking or block a room" />

      <div className="panel tscroll" style={{ padding: "6px 10px" }}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Room</th><th>Time</th><th>Client</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id}>
                <td>{day(b.date)}</td>
                <td>{b.room}</td>
                <td>{b.slot === "full" ? "Full day" : b.slot === "morning" ? "Morning" : "Afternoon"}</td>
                <td>{b.client ?? "—"}{b.note ? <><br /><span className="small muted">{b.note}</span></> : null}</td>
                <td><span className={`badge ${b.status === "confirmed" ? "b-good" : b.status === "held" ? "b-warn" : "b-short"}`}>{b.status}</span></td>
                <td>
                  <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    {b.status === "held" && <form action={updateBooking}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="action" value="confirm" /><button className="btn btn-primary btn-sm">Confirm</button></form>}
                    <form action={updateBooking}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="action" value="release" /><button className="btn btn-ghost btn-sm">Release</button></form>
                  </div>
                </td>
              </tr>
            ))}
            {!(bookings ?? []).length && <tr><td colSpan={6} className="muted">No bookings in these four weeks.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
