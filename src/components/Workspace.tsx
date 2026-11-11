import { Suspense } from "react";
import WorkNav from "./WorkNav";
import TableCards from "./TableCards";
import { whatsappLink } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import { loadWorkspace } from "@/lib/workspace";

/**
 * Frame for every staff and employer page: who is signed in, that role's own menu with live counts, and quick help.
 * Visitors and learners get the page without the frame (each page still does its own access check).
 */
export default async function Workspace({ children }: { children: React.ReactNode }) {
  const w = await loadWorkspace();
  if (!w) return <>{children}</>;
  const initials = w.name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");
  return (
    <section className={`block portal work work-${w.role}`} style={{ paddingTop: 24 }}>
      <div className="wrap portal-grid ws-shell">
        <aside className="portal-side no-print">
          <div className="portal-me">
            <span className="avatar" aria-hidden="true">{initials || "TA"}</span>
            <span style={{ minWidth: 0 }}>
              <b>{w.name}</b>
              <span className="small muted">{w.label}</span>
            </span>
          </div>
          <div className="work-label small"><b>{w.label}</b> · {ROLE_LABEL[w.role]}</div>
          <Suspense fallback={null}><WorkNav groups={w.groups} label={w.label} /></Suspense>
          <div className="portal-help">
            <a className="small" href={whatsappLink(`Hi, I'm ${w.role === "employer" ? "an employer" : "on the Academy staff"} and need help with the system.`, "support")} target="_blank" rel="noopener">Need help? WhatsApp support</a>
          </div>
        </aside>
        <div className="portal-main work-main">{children}</div>
        <TableCards />
      </div>
    </section>
  );
}
