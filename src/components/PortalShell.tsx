import Link from "next/link";
import PortalNav from "./PortalNav";
import TableCards from "./TableCards";
import { whatsappLink } from "@/lib/format";
import type { Student } from "@/lib/student";

/** Frame for every student portal page: who is signed in, the portal menu, and quick help. */
export default function PortalShell({ s, children }: { s: Student; children: React.ReactNode }) {
  const initials = String(s.name).split(/[\s@]/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");
  return (
    <section className="block portal" style={{ paddingTop: 24 }}>
      <div className="wrap portal-grid">
        <aside className="portal-side">
          <div className="portal-me">
            <span className="avatar" aria-hidden="true">{initials || "TA"}</span>
            <span style={{ minWidth: 0 }}>
              <b>{s.name}</b>
              <span className="small muted">Student portal</span>
            </span>
          </div>
          <PortalNav counts={{ courses: s.courses.length, certificates: s.certificates.length, due: s.duePlans.length, unread: s.unread }} />
          <div className="portal-help">
            <Link className="btn btn-ghost btn-sm" href="/courses">Find another course</Link>
            <a className="small" href={whatsappLink("Hi Training Africa Academy, I need help with my course.", "support")} target="_blank" rel="noopener">Need help? WhatsApp the Academy</a>
          </div>
        </aside>
        <div className="portal-main">{children}</div>
        <TableCards />
      </div>
    </section>
  );
}
