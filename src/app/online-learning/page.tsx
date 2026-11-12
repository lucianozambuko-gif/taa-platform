import PageHero from "@/components/PageHero";
import { CourseCard } from "@/components/CourseBits";
import { listCourses } from "@/lib/courses";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/online-learning");
export const dynamic = "force-dynamic";

export default async function OnlineLearningPage() {
  const courses = (await listCourses()).filter((c) => c.format === "Online" || c.format === "Blended");
  return (
    <>
    <PageHero eyebrow="Online learning" title={<>Start today, on your phone</>} photo="internal-training1"><p>Self-paced courses with short videos, captions, downloads and quizzes. You pick up where you left off.</p></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap">
        <div className="notice info" style={{ marginTop: 18, maxWidth: 820 }}>
          <b>Online theory</b>
          <span>Where a programme needs hands-on practicals, workplace experience or a supervised assessment, the course page says so, and those parts happen in person.</span>
        </div>
        <div className="grid g3" style={{ marginTop: 24 }}>{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      </div>
    </section>
    </>
  );
}
