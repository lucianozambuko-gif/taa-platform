import Link from "next/link";
import PortalShell from "@/components/PortalShell";
import { PortalHead, day } from "@/components/PortalBits";
import { loadStudent } from "@/lib/student";
import { markMessagesRead } from "../actions";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function Messages() {
  const s = await loadStudent("/dashboard/messages");
  return (
    <PortalShell s={s}>
      <PortalHead eyebrow="Student portal" title="Messages">
        {s.unread > 0 && <span className="badge b-bad big-count">{s.unread} unread</span>}
        {s.unread > 0 && <form action={markMessagesRead}><button className="btn btn-ghost btn-sm">Mark all as read</button></form>}
      </PortalHead>
      <div className="panel stack" style={{ gap: 14 }}>
        {s.messages.length === 0 && <p className="muted small">Messages from the Academy about your courses, payments and results appear here. Copies are also sent by email{" "}and, if you agreed, WhatsApp.</p>}
        {s.messages.map((m) => (
          <div key={m.id} className={`bubble-row${m.read_at ? "" : " unread"}`}>
            <span className="bubble-avatar" aria-hidden="true">TAA</span>
            <div className="bubble">
              {!m.read_at && <span className="bubble-dot" aria-label="Unread" />}
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 10 }}>
                <b>{m.subject}</b>
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>{day(m.created_at)}</span>
              </div>
              <p className="small">{m.body}</p>
              <div className="row" style={{ gap: 10 }}>
                {!m.read_at && <span className="badge b-bad">New</span>}
                {m.link && <Link className="small" href={m.link}>Open →</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="small muted">Choose how you get reminders in <Link href="/account">Profile and reminders</Link>.</p>
    </PortalShell>
  );
}
