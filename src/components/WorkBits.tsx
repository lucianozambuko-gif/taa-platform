import Link from "next/link";

/** Small pieces shared by the staff workspace overview pages. */
export type Todo = { key: string; n?: number; title: string; detail?: string; href: string; cta: string; tone?: "warn" | "bad" };

export function WorkHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="sec-head" style={{ marginBottom: 4 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 style={{ fontSize: "clamp(1.6rem,3.2vw,2.2rem)", marginTop: 6 }}>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export const today = () => new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

export function Tile({ href, value, label, warn }: { href: string; value: React.ReactNode; label: string; warn?: boolean }) {
  return (
    <Link href={href} className={`tile${warn ? " warn" : ""}`}><b className="tnum">{value}</b><span>{label}</span></Link>
  );
}

/** "To do" panel: what is waiting for this person, most urgent first. */
export function TodoList({ todos, title = "To do today", empty }: { todos: Todo[]; title?: string; empty: string }) {
  return (
    <div className="panel stack" style={{ gap: 4 }}>
      <h2 className="h3">{title}</h2>
      {todos.map((t) => (
        <div className="todo" key={t.key}>
          <span className="todo-text">
            {t.n != null && <span className={`badge ${t.tone === "bad" ? "b-bad" : "b-warn"} tnum`}>{t.n}</span>}
            <span style={{ minWidth: 0 }}><b>{t.title}</b>{t.detail && <><br /><span className="small muted">{t.detail}</span></>}</span>
          </span>
          <Link className="btn btn-ghost btn-sm" href={t.href}>{t.cta}</Link>
        </div>
      ))}
      {!todos.length && <p className="small muted" style={{ margin: "6px 0" }}>{empty}</p>}
    </div>
  );
}

/** A row of shortcuts to the tasks a role does most. */
export function QuickLinks({ title = "Shortcuts", links }: { title?: string; links: [string, string][] }) {
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <div className="eyebrow">{title}</div>
      <div className="stack" style={{ gap: 6 }}>
        {links.map(([href, label]) => <Link key={href + label} className="btn btn-ghost btn-sm" href={href} style={{ justifyContent: "flex-start" }}>{label}</Link>)}
      </div>
    </div>
  );
}
