import LeadForm from "@/components/LeadForm";

export const metadata = { title: "Assessment centre and venue hire" };

const ROOMS: [string, string, string][] = [
  ["Training room A", "30 seated", "Classroom training, workshops"],
  ["Training room B", "20 seated", "Classroom training, interviews"],
  ["Practical cleaning lab", "12 learners", "Practical sessions and assessments"],
  ["Computer room", "16 workstations", "Online assessments, digital skills"],
  ["Boardroom", "10 seated", "Meetings, moderation sessions"],
];

export default function VenuePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <section className="block" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <div className="eyebrow">Assessment centre and venue hire</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Book a room at our Johannesburg centre</h1>
          <p className="muted" style={{ maxWidth: "62ch" }}>For training, assessments, workshops and events. Bookings are confirmed by our centre coordinator with a written quotation.</p>
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
            <div className="tscroll">
              <table className="tbl">
                <thead><tr><th>Room</th><th>Capacity</th><th>Suited to</th></tr></thead>
                <tbody>{ROOMS.map(([r, c, s]) => <tr key={r}><td><b>{r}</b></td><td className="tnum">{c}</td><td>{s}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="small muted">Projector, Wi-Fi, backup power and parking. Sample facilities until confirmed by the Academy.</p>
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
