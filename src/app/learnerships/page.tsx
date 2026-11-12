import PageHero from "@/components/PageHero";
import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/learnerships");
export const dynamic = "force-dynamic";

export default async function LearnershipsPage() {
  const courses = (await listCourses()).filter((c) => c.kind !== "short");
  return (
    <>
    <PageHero eyebrow="Qualifications and learnerships" title={<>Full qualifications with workplace experience</>} photo="sedibeng-tvet-college-training-2"><p>Learnerships combine classroom learning, supervised workplace experience and an external assessment. Check the entry criteria, then apply for the next intake.</p></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap">
        <div className="grid g2" style={{ marginTop: 24 }}>{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      </div>
    </section>
    </>
  );
}
