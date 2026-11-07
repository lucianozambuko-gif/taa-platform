import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/learnerships");
export const dynamic = "force-dynamic";

export default async function LearnershipsPage() {
  const courses = (await listCourses()).filter((c) => c.kind !== "short");
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap">
        <div className="eyebrow">Qualifications and learnerships</div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Full qualifications with workplace experience</h1>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Learnerships combine classroom learning, supervised workplace experience and an external assessment. Check the entry criteria, then apply for the next intake.
        </p>
        <div className="grid g2" style={{ marginTop: 24 }}>{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      </div>
    </section>
  );
}
