import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import CourseForm from "../../CourseForm";

export const metadata = { title: "Edit course" };
export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin");
  if (profile?.role !== "admin") redirect("/");
  let course: Course | undefined;
  if (id !== "new") {
    const { data } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    course = data as Course;
  }
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18, maxWidth: 900 }}>
        <div className="crumbs"><Link href="/admin?tab=courses">Admin · Courses</Link><span>/</span><span>{course ? course.title : "New course"}</span></div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "clamp(1.6rem,3.4vw,2.2rem)" }}>{course ? "Edit course" : "Add a course"}</h1>
          {course && <Link className="btn btn-ghost btn-sm" href={`/courses/${course.slug}`} target="_blank">View on site</Link>}
        </div>
        {created && <p className="form-ok">Course created. Add its details below, then tick Published when it's ready.</p>}
        <CourseForm course={course} />
      </div>
    </section>
  );
}
