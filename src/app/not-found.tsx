import Link from "next/link";

export default function NotFound() {
  return (
    <section className="block">
      <div className="wrap" style={{ maxWidth: 620 }}>
        <div className="panel stack">
          <h1 style={{ fontSize: "1.6rem" }}>We couldn't find that page</h1>
          <p className="muted">It may have moved, or the course may no longer be listed.</p>
          <div><Link className="btn btn-primary" href="/courses">Browse courses</Link></div>
        </div>
      </div>
    </section>
  );
}
