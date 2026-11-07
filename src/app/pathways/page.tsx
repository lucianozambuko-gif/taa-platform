import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";

export const metadata = { title: "Career and learning pathways" };
export const dynamic = "force-dynamic";

const PATHS: { title: string; goal: string; slugs: string[] }[] = [
  { title: "Cleaning and facilities", goal: "From your first cleaning job to a full qualification.", slugs: ["professional-cleaning-practices", "hygiene-and-infection-control", "cleaning-operations-learnership"] },
  { title: "Team leader", goal: "Move from front-line work into supervising a team.", slugs: ["customer-service-excellence", "business-writing-at-work", "supervisory-skills"] },
  { title: "Workplace safety", goal: "Become your workplace's first aider and safety representative.", slugs: ["first-aid-level-1", "health-and-safety-representative"] },
];

export default async function PathwaysPage() {
  const courses = await listCourses();
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 30 }}>
        <div>
          <div className="eyebrow">Career and learning pathways</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Start with where you want to be</h1>
          <p className="muted" style={{ maxWidth: "62ch" }}>Each pathway lists courses in the order most learners take them. Start at any step that matches your experience.</p>
        </div>
        {PATHS.map((p) => (
          <div key={p.title} className="stack" style={{ gap: 14 }}>
            <div>
              <h2 style={{ fontSize: "1.4rem" }}>{p.title}</h2>
              <p className="muted">{p.goal}</p>
            </div>
            <ol className="grid g3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {p.slugs.map((s, i) => {
                const c = bySlug.get(s);
                return c ? (
                  <li key={s} className="stack" style={{ gap: 8 }}>
                    <span className="eyebrow">Step {i + 1}</span>
                    <CourseCard course={c} />
                  </li>
                ) : null;
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
