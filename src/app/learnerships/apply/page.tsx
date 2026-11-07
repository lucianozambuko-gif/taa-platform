import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import { getCourse } from "@/lib/courses";

export const metadata = { title: "Learnership application" };
export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course: slug } = await searchParams;
  const course = slug ? await getCourse(slug) : null;
  if (!course) notFound();
  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div className="crumbs"><Link href="/learnerships">Learnerships</Link><span>/</span><span>Apply</span></div>
        <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.3rem)", marginBottom: 8 }}>{course.title}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Entry criteria: {course.entry_requirements}</p>
        <LeadForm
          type="learnership"
          source="course_page"
          submitLabel="Submit application"
          successTitle="Application received"
          successText="{team} will contact you within five working days with the next steps: a document check, then a short assessment."
        >
          <input type="hidden" name="course" value={course.slug} />
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" required /></div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" name="phone" required /></div>
            <div className="field"><label htmlFor="email">Email (optional)</label><input id="email" name="email" type="email" /></div>
            <div className="field">
              <label htmlFor="education">Highest grade passed</label>
              <select id="education" name="education"><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Matric</option></select>
            </div>
            <div className="field">
              <label htmlFor="situation">Current situation</label>
              <select id="situation" name="situation"><option>Unemployed, available full time</option><option>Employed, nominated by employer</option></select>
            </div>
          </div>
        </LeadForm>
      </div>
    </section>
  );
}
