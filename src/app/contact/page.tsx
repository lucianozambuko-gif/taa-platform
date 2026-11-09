import LeadForm from "@/components/LeadForm";
import PlaceholderNote from "@/components/PlaceholderNote";
import TrackedLink from "@/components/TrackedLink";
import { whatsappLink } from "@/lib/format";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/contact");

export default function ContactPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22 }}>
        <div>
          <div className="eyebrow">Contact and locations</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Talk to a course advisor</h1>
          <p className="muted" style={{ maxWidth: "62ch" }}>We reply to messages within one working day. For the fastest answer, WhatsApp us.</p>
        </div>
        <PlaceholderNote />
        <div className="grid g2" style={{ alignItems: "start" }}>
          <div className="stack" style={{ gap: 16 }}>
            <div className="panel stack">
              <h2 style={{ fontSize: "1.15rem" }}>Johannesburg training centre</h2>
              <p className="muted">[Street address to be supplied]<br />Johannesburg, Gauteng</p>
              <p className="small muted">Monday to Friday, 08:00–16:30. Parking on site.</p>
              <div><a className="btn btn-ghost btn-sm" href="https://www.google.com/maps/search/?api=1&query=Johannesburg" target="_blank" rel="noopener">Open in Google Maps</a></div>
            </div>
            <div className="panel stack">
              <h2 style={{ fontSize: "1.15rem" }}>Phone and email</h2>
              <p className="muted">Phone: <span className="tbc">[To be supplied]</span><br />Email: <span className="tbc">[To be supplied]</span></p>
              <div>
                <TrackedLink className="btn btn-wa" href={whatsappLink("Hi Training Africa Academy, I have a question.")} target="_blank" rel="noopener" event="whatsapp_click" params={{ page: "contact" }}>
                  WhatsApp us
                </TrackedLink>
              </div>
            </div>
          </div>
          <LeadForm type="course_enquiry" source="contact_page" submitLabel="Send message" successTitle="Message received" successText="A course advisor will reply within one working day.">
            <h2 style={{ fontSize: "1.35rem" }}>Send us a message</h2>
            <div className="grid g2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" /></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
            </div>
            <div className="field"><label htmlFor="note">How can we help?</label><textarea id="note" name="note" required /></div>
          </LeadForm>
        </div>
      </div>
    </section>
  );
}
