import Link from "next/link";
import { CourseCard } from "@/components/CourseBits";
import { CompareBar } from "@/components/Compare";
import FilterPanel from "@/components/FilterPanel";
import { DURATION_BANDS, intakeKeys, listCourses, type CourseFilters } from "@/lib/courses";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/courses");
export const dynamic = "force-dynamic";

const SUBJECTS = ["Cleaning & hygiene", "Health & safety", "Soft skills"];
const KINDS: [string, string][] = [["accredited", "Accredited"], ["qualification", "Full qualification"], ["short", "Non-accredited"]];
const FORMATS = ["Online", "Blended", "Classroom", "Workplace"];
const LOCATIONS = ["Online", "Johannesburg", "On-site"];

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""}>
        <option value="">Any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<CourseFilters> }) {
  const filters = await searchParams;
  const [courses, all] = await Promise.all([listCourses(filters), listCourses()]);
  const nqfLevels = [...new Set(all.filter((c) => c.accreditation_approved && c.nqf_level).map((c) => c.nqf_level as string))].sort();
  const monthOrder = (k: string) => (k === "anytime" ? 0 : Date.parse("1 " + k) || 9e15);
  const intakes = [...new Set(all.flatMap((c) => intakeKeys(c.intakes)))].sort((a, b) => monthOrder(a) - monthOrder(b));
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap">
        <div className="eyebrow">Find a course</div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.6vw,2.6rem)", margin: "6px 0 24px" }}>Course catalogue</h1>
        <div className="cat">
          <FilterPanel active={Object.values(filters).filter(Boolean).length}>
          <form className="filter-body" action="/courses" aria-label="Filters">
            <div className="field">
              <label htmlFor="f-q">Keyword</label>
              <input id="f-q" name="q" defaultValue={filters.q ?? ""} placeholder="e.g. safety" />
            </div>
            <Select name="learner" label="I am" value={filters.learner} options={[["individual", "An individual learner"], ["employer", "An employer"], ["learnership", "A learnership applicant"]]} />
            <Select name="subject" label="Subject" value={filters.subject} options={SUBJECTS.map((s) => [s, s])} />
            <Select name="kind" label="Accreditation" value={filters.kind} options={KINDS} />
            <Select name="format" label="Format" value={filters.format} options={FORMATS.map((s) => [s, s])} />
            <Select name="location" label="Location" value={filters.location} options={LOCATIONS.map((s) => [s, s])} />
            <Select name="duration" label="Duration" value={filters.duration} options={DURATION_BANDS} />
            <Select name="intake" label="Start date" value={filters.intake} options={intakes.map((k) => [k, k === "anytime" ? "Start any time" : k])} />
            {nqfLevels.length > 0 ? (
              <Select name="nqf" label="NQF level" value={filters.nqf} options={nqfLevels.map((n) => [n, `NQF ${n}`])} />
            ) : (
              <div className="field"><span className="flabel">NQF level</span><span className="small muted">Available once accreditation details are approved.</span></div>
            )}
            <div className="field">
              <label htmlFor="f-max">Maximum price (R)</label>
              <input id="f-max" name="max" type="number" min={0} step={50} defaultValue={filters.max ?? ""} placeholder="Any" />
            </div>
            <button className="btn btn-primary">Apply filters</button>
            <Link href="/courses" className="small">Clear all filters</Link>
          </form>
          </FilterPanel>
          <div style={{ minWidth: 0 }}>
            <div className="results-bar">
              <p><b className="tnum">{courses.length}</b> <span className="muted">courses found</span></p>
            </div>
            {courses.length ? (
              <>
                <h2 className="sr-only">Matching courses</h2>
                <div className="grid g2">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
                <CompareBar />
              </>
            ) : (
              <div className="panel stack" style={{ textAlign: "center", padding: 40 }}>
                <h3>No courses match these filters</h3>
                <p className="muted">Try removing a filter, or ask us on WhatsApp and we'll suggest a course.</p>
                <div><Link className="btn btn-ghost" href="/courses">Clear filters</Link></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
