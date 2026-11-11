/** Small pieces shared by the student portal pages. */
export function Ring({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 64 64" width={size} height={size} aria-label={`${pct}% complete`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--sunk)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{pct}%</text>
    </svg>
  );
}

export function ResultBadge({ result, moderation, poe }: { result: string | null; moderation: string | null; poe: string | null }) {
  if (result === "competent")
    return <span className={`badge ${moderation === "endorsed" ? "b-good" : "b-short"}`}>{moderation === "endorsed" ? "Competent · moderated" : "Competent · awaiting moderation"}</span>;
  if (result === "not_yet_competent") return <span className="badge b-warn">Not yet competent</span>;
  return <span className="badge b-short">{poe ? "Portfolio submitted · awaiting assessment" : "Assessment pending"}</span>;
}

export const day = (d: string | Date) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

export function PortalHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
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
