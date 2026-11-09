import Link from "next/link";

export const metadata = { title: "You're offline" };

export default function Offline() {
  return (
    <section className="block">
      <div className="wrap stack" style={{ maxWidth: 560, gap: 14 }}>
        <h1 style={{ fontSize: "1.8rem" }}>You&apos;re offline</h1>
        <p className="muted">This page hasn&apos;t been saved on your phone yet. Lessons and pages you opened recently still work without signal, and your progress saves when you&apos;re back online.</p>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn btn-primary" href="/dashboard">My learning</Link>
          <Link className="btn btn-ghost" href="/courses">Courses</Link>
        </div>
      </div>
    </section>
  );
}
