import Link from "next/link";
import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await listCourses();
  const featured = courses.filter((c) => c.featured).slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Skills training in Johannesburg and online</div>
            <h1 style={{ marginTop: 10 }}>Practical training that gets people working, and keeps teams working well.</h1>
            <p className="lead">
              Short skills courses, accredited programmes and learnerships, with clear prices, real dates and online learning you can
              start today.
            </p>
            <form className="search" action="/courses" role="search">
              <input name="q" aria-label="Search courses" placeholder="Search courses, e.g. first aid, cleaning, supervisor" />
              <button className="btn btn-primary">Search</button>
            </form>
          </div>
          <div className="routes">
            <Link className="route primary" href="/courses?learner=individual">
              <div className="t">I want to study <span>→</span></div>
              <p>Find a course by career goal, see the full price and enrol online.</p>
            </Link>
            <Link className="route" href="/employers">
              <div className="t">Train my team <span>→</span></div>
              <p>Group quotes, on-site training and progress reporting for HR and L&amp;D.</p>
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="modes">
          <div><b>Online, self-paced</b><span className="small muted">Start today, learn on your phone</span></div>
          <div><b>Blended</b><span className="small muted">Online theory + practical days</span></div>
          <div><b>Classroom</b><span className="small muted">At our Johannesburg centre</span></div>
          <div><b>On-site</b><span className="small muted">We train at your workplace</span></div>
        </div>
      </div>

      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="eyebrow">Featured courses</div>
              <h2 style={{ marginTop: 6 }}>Prices shown up front, dates you can book</h2>
            </div>
            <Link className="btn btn-ghost" href="/courses">See all {courses.length} courses</Link>
          </div>
          <div className="grid g3">{featured.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap grid g2">
          <div className="panel stack">
            <div className="eyebrow">Accreditation</div>
            <h3>Every claim checked against current approval letters</h3>
            <p className="muted">
              Accredited programmes show the accrediting body, SAQA ID, NQF level and credits once the Academy has signed them off.
              Non-accredited skills courses are labelled clearly.
            </p>
          </div>
          <div className="panel stack">
            <div className="eyebrow">Assessment centre and venue hire</div>
            <h3>Training rooms, a practical cleaning lab and a computer room</h3>
            <p className="muted">Check available dates and send a booking request in under two minutes.</p>
            <div><Link className="btn btn-primary" href="/venue">Request a venue booking</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
