import Link from "next/link";
import { KIND_LABEL, rand } from "@/lib/format";
import type { Course } from "@/lib/types";
import { CompareToggle } from "./Compare";
import Photo from "./Photo";

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

/** Subject artwork for course cards: a colour family and a simple line icon. */
const SUBJECT_STYLE: Record<string, { tone: string; icon: React.ReactNode }> = {
  "Cleaning & hygiene": {
    tone: "teal",
    icon: (
      <>
        <path d="M14 8h8l2 6H12z" />
        <path d="M12 14h12v14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
        <path d="M22 8V5h-4" />
        <path d="M29 10l2-2M30 15h3M29 20l2 2" />
      </>
    ),
  },
  "Health & safety": {
    tone: "ochre",
    icon: (
      <>
        <path d="M18 4l11 4v8c0 7-5 12-11 14C12 28 7 23 7 16V8z" />
        <path d="M18 11v10M13 16h10" />
      </>
    ),
  },
  "Soft skills": {
    tone: "plum",
    icon: (
      <>
        <path d="M5 8h17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-5 4v-4H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
        <path d="M27 13h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1v4l-5-4h-6" />
      </>
    ),
  },
};
const DEFAULT_STYLE = {
  tone: "slate",
  icon: (
    <>
      <path d="M6 7h10a3 3 0 0 1 3 3v20a2 2 0 0 0-2-2H6z" />
      <path d="M30 7H20a3 3 0 0 0-3 3v20a2 2 0 0 1 2-2h11z" />
    </>
  ),
};

export function SubjectCover({ course }: { course: Course }) {
  const style = SUBJECT_STYLE[course.subject] ?? DEFAULT_STYLE;
  if (course.image_url)
    return (
      <>
        <div className="photo-cover">
          <Photo url={course.image_url} alt="" />
          <span className="cover-label">{course.subject}</span>
        </div>
        <SubjectArt tone={style.tone} icon={style.icon} subject={course.subject} saverOnly />
      </>
    );
  return <SubjectArt tone={style.tone} icon={style.icon} subject={course.subject} />;
}

function SubjectArt({ tone, icon, subject, saverOnly }: { tone: string; icon: React.ReactNode; subject: string; saverOnly?: boolean }) {
  return (
    <div className={`cover tone-${tone}${saverOnly ? " saver-only" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 36 34" width="44" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      <span className="cover-label">{subject}</span>
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <div className="ccard-wrap">
    <CompareToggle slug={course.slug} title={course.title} />
    <Link className="ccard" href={`/courses/${course.slug}`}>
      <SubjectCover course={course} />
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
    </div>
  );
}
