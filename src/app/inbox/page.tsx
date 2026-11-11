import Link from "next/link";
import { redirect } from "next/navigation";
import Workspace from "@/components/Workspace";
import { WorkHead } from "@/components/WorkBits";
import { WORKSPACE_LABEL, type Role } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";
import { markInboxRead } from "./actions";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
type N = { id: string; subject: string; body: string; link: string | null; created_at: string; read_at: string | null };

/** Messages for staff and employers: anything sent to this person, plus team alerts for sales and admin. */
export default async function Inbox() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/inbox");
  const role = (profile?.role ?? "learner") as Role;
  if (role === "learner") redirect("/dashboard/messages");
  const team = role === "sales" || role === "admin";
  const [{ data: mine }, { data: alerts }] = await Promise.all([
    supabase.from("notifications").select("id, subject, body, link, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    team ? supabase.from("notifications").select("id, subject, body, link, created_at, read_at").eq("audience", "staff").order("created_at", { ascending: false }).limit(25) : Promise.resolve({ data: [] as N[] }),
  ]);
  const own = (mine ?? []) as N[];
  const unread = own.filter((m) => !m.read_at).length;
  const EMPTY: Record<string, string> = {
    facilitator: "When the content editor approves or declines a lesson you suggested, the message appears here.",
    moderator: "Messages from the Academy about moderation appear here.",
    employer: "Messages from the Academy about your staff and requests appear here.",
    content: "Messages sent to you by the Academy appear here.",
    sales: "Messages sent to you personally appear here. Team alerts are listed below.",
    admin: "Messages sent to you personally appear here. Team alerts are listed below.",
  };

  return (
    <Workspace>
      <WorkHead eyebrow={WORKSPACE_LABEL[role]} title="Messages">
        {unread > 0 && <span className="badge b-bad big-count">{unread} unread</span>}
        {unread > 0 && <form action={markInboxRead}><button className="btn btn-ghost btn-sm">Mark all as read</button></form>}
      </WorkHead>
      <div className="panel stack" style={{ gap: 14 }}>
        <h2 className="h3">For you</h2>
        {!own.length && <p className="muted small" style={{ margin: 0 }}>{EMPTY[role]}</p>}
        {own.map((m) => (
          <div key={m.id} className={`bubble-row${m.read_at ? "" : " unread"}`}>
            <span className="bubble-avatar" aria-hidden="true">TAA</span>
            <div className="bubble">
              {!m.read_at && <span className="bubble-dot" aria-label="Unread" />}
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 10 }}>
                <b>{m.subject}</b>
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>{when(m.created_at)}</span>
              </div>
              <p className="small">{m.body}</p>
              {m.link && <Link className="small" href={m.link}>Open →</Link>}
            </div>
          </div>
        ))}
      </div>
      {team && (
        <div className="panel stack" style={{ gap: 4 }}>
          <h2 className="h3">Team alerts</h2>
          <p className="small muted" style={{ margin: 0 }}>New enquiries, paid orders and advisor hand-overs, as sent to the staff mailbox.</p>
          {((alerts ?? []) as N[]).map((a) => (
            <div className="todo" key={a.id}>
              <span style={{ minWidth: 0 }}><b>{a.subject}</b><br /><span className="small muted">{a.body} · {when(a.created_at)}</span></span>
              {a.link && <Link className="btn btn-ghost btn-sm" href={a.link}>Open</Link>}
            </div>
          ))}
          {!(alerts ?? []).length && <p className="small muted">No alerts yet.</p>}
        </div>
      )}
      <p className="small muted">Choose how you get reminders in <Link href="/account">My profile</Link>.</p>
    </Workspace>
  );
}
