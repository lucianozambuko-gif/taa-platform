import PageHero from "@/components/PageHero";
import LeadForm from "@/components/LeadForm";
import VenueCalendar from "@/components/VenueCalendar";
import { ROOMS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/venue");

export const dynamic = "force-dynamic";

export default async function VenuePage() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(today + "T00:00:00Z");
  const end = new Date(start.getTime() + 20 * 864e5).toISOString().slice(0, 10);
  let busy: { room: string; date: string; slot: string }[] = [];
  try {
    const supabase = await createClient();
    busy = ((await supabase.rpc("venue_busy", { from_date: today, to_date: end })).data ?? []) as typeof busy;
  } catch {}
  return (
    <>
      <PageHero eyebrow="Assessment centre and venue hire" title={<>Book a room at our Johannesburg centre</>} photo="costing-and-estimation-training-2"><p>For training, assessments, workshops and events. Bookings are confirmed by our centre coordinator with a written quotation.</p></PageHero>
      <section className="block" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <div className="notice" style={{ marginTop: 18, maxWidth: 820 }}>
            <b>Scope</b>
            <span>Approved assessment uses are listed exactly as stated in the Academy's current approval letters. This page does not imply any assessment permission that has not been approved.</span>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div className="panel stack">
            <h2 style={{ fontSize: "1.35rem" }}>Facilities</h2>
            <div className="tscroll" tabIndex={0}>
              <table className="tbl">
                <thead><tr><th>Room</th><th>Capacity</th><th>Suited to</th></tr></thead>
                <tbody>{ROOMS.map(([r, c, s]) => <tr key={r}><td><b>{r}</b></td><td className="tnum">{c}</td><td>{s}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="small muted">Projector, Wi-Fi, backup power and parking. Sample facilities until confirmed by the Academy.</p>
          </div>
          <div className="panel stack" style={{ gridColumn: "1 / -1", gap: 10 }}>
            <h2 style={{ fontSize: "1.35rem" }}>Availability, next three weeks</h2>
            <p className="small muted">Updated live by our centre coordinator. Pick a free day below, then send your request.</p>
            <VenueCalendar busy={busy} start={start} days={21} />
          </div>
          <LeadForm
            type="venue"
            source="venue_page"
            submitLabel="Request this booking"
            successTitle="Booking request sent"
            successText="The {team} will confirm availability and send a quotation within one working day."
          >
            <h2 style={{ fontSize: "1.35rem" }}>Request a booking</h2>
            <div className="grid g2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="room">Room</label><select id="room" name="room">{ROOMS.map(([r]) => <option key={r}>{r}</option>)}</select></div>
              <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" min={today} required /></div>
              <div className="field"><label htmlFor="slot">Time</label><select id="slot" name="slot"><option value="full">Full day</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></div>
              <div className="field"><label htmlFor="staff_count">Attendees</label><input id="staff_count" name="staff_count" type="number" min={1} required /></div>
              <div className="field"><label htmlFor="purpose">Purpose</label><select id="purpose" name="purpose"><option>Training session</option><option>Assessment (approved scope only)</option><option>Workshop or event</option><option>Meeting</option></select></div>
              <div className="field"><label htmlFor="company">Organisation</label><input id="company" name="company" required /></div>
              <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required /></div>
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" /></div>
            </div>
          </LeadForm>
        </div>
      </section>
    </>
  );
}
