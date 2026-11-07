import Link from "next/link";
import { KIND_LABEL, rand } from "@/lib/format";
import type { Course } from "@/lib/types";

export function KindBadge({ course }: { course: Course }) {
  if (course.kind === "accredited")
    return (
      <span className="badge b-acc">
        {course.accreditation_approved ? "Accredited" : "Accredited · details pending sign-off"}
      </span>
    );
  if (course.kind === "qualification") return <span className="badge b-qual">{KIND_LABEL.qualification}</span>;
  return <span className="badge b-short">{KIND_LABEL.short}</span>;
}

export function PriceBlock({ course }: { course: Course }) {
  if (course.price_basis !== "fixed" || course.price_cents == null)
    return (
      <div className="price" style={{ fontSize: "1.05rem" }}>
        {course.price_basis === "learnership" ? "Funded / by quote" : "Price on quotation"}
        <small>{course.price_basis === "learnership" ? "Learnership places by application" : "Ask for a quote"}</small>
      </div>
    );
  return (
    <div className="price tnum">
      {rand(course.price_cents)}
      <small>per learner, incl. VAT</small>
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link className="ccard" href={`/courses/${course.slug}`}>
      <div className="meta">
        <KindBadge course={course} />
        <span className="badge b-short">{course.format}</span>
      </div>
      <h3>{course.title}</h3>
      <p className="muted small">{course.summary}</p>
      <div className="facts">
        <span>{course.duration}</span>
        <span>{course.location}</span>
        <span className="mono">{course.code}</span>
      </div>
      <div className="foot">
        <PriceBlock course={course} />
        <span className="linkbtn" aria-hidden="true">View course</span>
      </div>
    </Link>
  );
}
