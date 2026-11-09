import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { ROLE_HELP, ROLE_LABEL, isStaff, type Role } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";

export const metadata = { title: "Staff guide" };

const GUIDE: { id: string; title: string; roles: Role[]; steps: string[] }[] = [
  { id: "start", title: "Signing in and finding your way", roles: ["admin", "sales", "content", "facilitator", "moderator"], steps: [
    "Sign in with your staff email. You land on your own area: the Dashboard for admin, sales and content staff, My learners for facilitators, and To moderate for moderators.",
    "The menu at the top of every page is built for your role. Items with an arrow open a short list (for example Leads → Assigned to me). An orange number shows how many things are waiting for you. On a phone, tap Menu, or use the bar at the bottom of the screen.",
    "View website (in the menu) shows the public site as learners see it.",
    "Everything you change is saved straight away and written to the audit log with your name.",
  ]},
  { id: "courses", title: "Adding or changing a course", roles: ["admin", "content"], steps: [
    "Courses tab → Add a course, or click a course to edit it.",
    "Fill in the course page fields: code, summary, outcomes, entry requirements, assessment, practical requirements, intakes, price and brochure link.",
    "Accreditation details (body, SAQA ID, NQF level, credits, approved scope) only show on the website once you tick ‘Accreditation details checked against the current approval letter’. Only tick it after checking the current approval letter.",
    "Tick ‘Approved for automatic certificates’ only for short online courses approved for automatic certificates.",
    "Tick Published when the course is ready. Untick it to hide a course without deleting it.",
    "Quick price changes: Courses tab → type the new price → Publish.",
  ]},
  { id: "lessons", title: "Building online lessons", roles: ["admin", "content"], steps: [
    "Open a course → Online lessons.",
    "Add a module, then add lessons to it: Video, Download (PDF) or Quiz.",
    "Open a lesson to add content. Upload an MP4 (up to 50 MB) or paste a YouTube, Vimeo or video-host link. Add captions as a .vtt file.",
    "Downloads: upload the PDF. Only enrolled learners can open uploaded files.",
    "Quizzes: write each question on a line starting with Q:, answers starting with -, and mark the correct answer with *. Leave a blank line between questions. The pass mark is 70%.",
    "Use Move up / Move down to change the order. Lessons marked ‘Needs content’ are still empty.",
  ]},
  { id: "content", title: "News, FAQs, homepage and search", roles: ["admin", "content"], steps: [
    "Site content tab → New article for news, intakes or resources. Leave a blank line between paragraphs; start a line with ## for a heading.",
    "Add a search description and an optional button (for example to a course). Tick Published to show it.",
    "Homepage figures and testimonials: replace the bracketed sample values and untick ‘Sample figures’ once approved.",
    "Announcement bar: type a short message, add a link, tick ‘Show’.",
    "FAQs: one question per block, starting with Q:.",
    "Page titles (SEO): leave blank to keep the default.",
    "Redirects: when the new site goes live, add each old page address and where it should now go, so old Google links keep working.",
  ]},
  { id: "leads", title: "Handling enquiries (leads)", roles: ["admin", "sales"], steps: [
    "Leads tab shows every form submission with a reference number, where it came from and which team it was routed to.",
    "Set yourself as Owner, update the status (new → contacted → quoted → won or lost) and add a short note. Press Save.",
    "Use the WhatsApp or Email buttons to reply. Use ‘Assigned to me’ to see your own list.",
    "Download CSV exports all leads for reporting.",
  ]},
  { id: "orders", title: "Payments, unpaid checkouts and refunds", roles: ["admin", "sales"], steps: [
    "Orders → ‘Unpaid: follow up’ lists people who started paying but didn't finish. Tap WhatsApp to send them a link to finish, then Mark followed up.",
    "Refunds: refund the money in the PayFast dashboard first, then open the order → Record a refund. Choose whether the learner keeps access.",
    "Click an invoice number to open or print the receipt.",
  ]},
  { id: "access", title: "Giving a learner access (EFT or employer)", roles: ["admin", "sales"], steps: [
    "The learner signs up on the website first.",
    "Learners & progress → Give a learner course access: enter their email, choose the course and, if an employer is paying, the employer name.",
    "They get a message and the course appears in their dashboard.",
    "Employer progress report shows all learners for one employer; print or save as PDF to send to the employer.",
  ]},
  { id: "venue", title: "Venue bookings", roles: ["admin", "sales"], steps: [
    "Venue bookings → requests from the website appear at the top.",
    "Check the calendar, then Confirm or hold a room. The system refuses double bookings.",
    "A confirmed booking emails the client and marks the lead as won. Use Decline with a reason if you can't help.",
    "Block rooms for maintenance or internal use so the public calendar shows them as unavailable.",
  ]},
  { id: "coupons", title: "Discount coupons", roles: ["admin", "sales"], steps: [
    "Sales staff: Coupons → Request a coupon with a code, discount, optional course, limit, expiry and reason.",
    "Admins approve or reject requests. Only approved coupons work at checkout.",
    "Switch a coupon off at any time.",
  ]},
  { id: "teaching", title: "Facilitators: tracking learners and recording results", roles: ["admin", "facilitator"], steps: [
    "Teaching shows only the courses you're assigned to.",
    "See each learner's progress, quiz average and last activity. ‘Gone quiet’ learners can be nudged on WhatsApp.",
    "For classroom and accredited programmes, choose Competent or Not yet competent, add a note and Save. The result goes to the moderator; the learner gets a statement of results once it's endorsed.",
    "Open portfolio shows the learner's full portfolio of evidence: lessons and quiz scores, attendance, evidence files and sign-offs. Add photos or signed checklists there or from the Teaching page.",
    "If the moderator refers a result back, the reason shows on the Teaching page. Fix the evidence or decision and save the result again.",
    "Quizzes (in your menu): who passed each quiz, who has failed it twice or more, and which questions most learners get wrong. Change the questions there for the courses you teach; learners get the new questions on their next attempt.",
  ]},
  { id: "moderation", title: "Moderators: endorsing results and the verification pack", roles: ["admin", "moderator"], steps: [
    "Moderation lists every assessed result waiting for you, with a suggested sample: all ‘not yet competent’ decisions and at least one in four competent decisions per assessor.",
    "Open portfolio, check the evidence is valid, authentic, current and sufficient, and that the assessor's decision is fair. Write your report.",
    "Endorse the result to release the learner's statement of results, or Refer back to the assessor with the reason. The facilitator is notified either way.",
    "Download verification pack gives a spreadsheet for QCTO or SETA visits: each learner's evidence, attendance, assessor and moderator sign-off, with a link to the portfolio. Print any portfolio to PDF from its page.",
  ]},
  { id: "advisor", title: "The course advisor chat", roles: ["admin", "sales"], steps: [
    "The ‘Ask an advisor’ chat on the website (and on WhatsApp, once connected) answers questions about courses, prices, dates, learnerships and company training from the live course list and FAQs.",
    "When someone asks for a person, it takes their name and number, creates a lead routed to the right team, and gives them the WhatsApp link of whoever is on duty.",
    "Leads → Advisor chats shows every conversation and the questions it couldn't answer. Add those to the FAQs and it will answer them next time.",
  ]},
  { id: "users", title: "Users, roles and POPIA (admin)", roles: ["admin"], steps: [
    "Users tab: change anyone's role. Facilitators also need courses assigned.",
    "When someone asks to be deleted: Users → Delete personal info → tick to confirm → Anonymise. Payment records stay for tax but no longer show their name.",
    "For an enquiry, use ‘Remove personal data’ on the lead.",
    "POPIA retention: remove personal details from old closed enquiries (for example older than 24 months).",
    "Audit log shows who changed what and when.",
  ]},
];

export default async function StaffGuide() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin/guide");
  const role = profile?.role as Role;
  if (!isStaff(role)) redirect("/");
  const mine = GUIDE.filter((g) => g.roles.includes(role));
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18, maxWidth: 860 }}>
        <div className="row no-print" style={{ justifyContent: "space-between" }}>
          <Link href={role === "facilitator" ? "/facilitator" : role === "moderator" ? "/moderator" : "/admin"}>← Back</Link>
          <PrintButton label="Print / save as PDF" />
        </div>
        <div>
          <div className="eyebrow">Staff guide · {ROLE_LABEL[role]}</div>
          <h1 style={{ fontSize: "clamp(1.7rem,3.6vw,2.4rem)", marginTop: 6 }}>How to run the website</h1>
          <p className="muted">{ROLE_HELP[role]}. This guide shows only the parts your role uses.</p>
        </div>
        <nav className="panel row" style={{ gap: 6 }} aria-label="Guide sections">
          {mine.map((g) => <a key={g.id} className="btn btn-ghost btn-sm" href={`#${g.id}`}>{g.title}</a>)}
        </nav>
        {mine.map((g) => (
          <div key={g.id} id={g.id} className="panel stack" style={{ gap: 8 }}>
            <h2 style={{ fontSize: "1.25rem" }}>{g.title}</h2>
            <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
              {g.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
        ))}
        <p className="small muted">Need help? Contact Cloud Uko support, or WhatsApp 074 092 6666.</p>
      </div>
    </section>
  );
}
