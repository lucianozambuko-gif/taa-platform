import Link from "next/link";

export const metadata = { title: "Site map" };

type Row = [string, string | null, "Built" | "Template", string];
const PAGES: Row[] = [
  ["Home", "/", "Built", "Two entry routes, search, featured courses"],
  ["About and accreditations", "/about", "Template", "Accreditation table awaits approval letters"],
  ["Find a course / catalogue", "/courses", "Built", "Filters by subject, accreditation, format, location, price"],
  ["Course detail", "/courses/customer-service-excellence", "Built", "Price, VAT, practical rules, brochure, WhatsApp"],
  ["Online learning", "/online-learning", "Built", "Online and blended courses"],
  ["Training for employers", "/employers", "Built", "Group quotes and multi-learner registration"],
  ["Qualifications and learnerships", "/learnerships", "Built", "Learnership application form"],
  ["Career / learning pathways", "/pathways", "Built", "Three pathways linking courses in order"],
  ["Assessment centre and venue hire", "/venue", "Built", "Facilities and booking request"],
  ["Facilitators / training approach", "/facilitators", "Template", "Awaits facilitator profiles"],
  ["Resources / FAQs", "/faqs", "Built", "Common questions"],
  ["News / insights", "/news", "Built", "Article listing and article template"],
  ["Contact / locations", "/contact", "Template", "Awaits address and phone"],
  ["Privacy notice", "/privacy", "Template", "Awaits Information Officer approval"],
  ["Terms and learner policies", "/terms", "Template", "Awaits Academy approval"],
  ["Login / learner dashboard", "/dashboard", "Built", "Enrolled courses, progress, recommendations"],
];
const SUPPORTING: Row[] = [
  ["Campaign landing page (reusable)", "/campaigns/first-aid-level-1?utm_source=facebook", "Built", "Any course; tracks the campaign source on every lead"],
  ["Checkout, payment and receipts", "/courses/customer-service-excellence", "Built", "Start from a course page; printable receipt after payment"],
  ["Lesson player, quizzes and certificates", "/dashboard", "Built", "Certificates only for programmes approved for automatic issue"],
  ["Admin back office", "/admin", "Built", "Leads, orders, learner progress, course editor, admin enrolment, audit log"],
];

function Table({ rows }: { rows: Row[] }) {
  return (
    <div className="panel tscroll" style={{ padding: "6px 10px" }}>
      <table className="tbl">
        <thead><tr><th>Page</th><th>Status</th><th>Notes</th><th /></tr></thead>
        <tbody>
          {rows.map(([name, href, status, note]) => (
            <tr key={name}>
              <td><b>{name}</b></td>
              <td><span className={`badge ${status === "Built" ? "b-good" : "b-warn"}`}>{status === "Built" ? "Built" : "Built, awaiting content"}</span></td>
              <td className="muted">{note}</td>
              <td>{href && <Link href={href}>Open</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SiteMapPage() {
  const built = PAGES.filter((p) => p[2] === "Built").length;
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 20 }}>
        <div>
          <div className="eyebrow">Site map</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.6rem)", margin: "8px 0 10px" }}>All 15 required page templates</h1>
          <p className="muted" style={{ maxWidth: "64ch" }}>
            Every page in RFQ section 3 exists. {built} are fully working; {PAGES.length - built} are built and waiting for the Academy's approved content.
          </p>
        </div>
        <Table rows={PAGES} />
        <h2 style={{ fontSize: "1.3rem" }}>Supporting pages</h2>
        <Table rows={SUPPORTING} />
      </div>
    </section>
  );
}
