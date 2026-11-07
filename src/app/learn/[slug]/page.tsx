import { notFound, redirect } from "next/navigation";
import { getLearningState } from "@/lib/learning";

export const dynamic = "force-dynamic";

/** Resumes the course at the first lesson the learner hasn't finished. */
export default async function ResumeCourse({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await getLearningState(slug);
  if (!state) notFound();
  if (!state.enrolled) redirect(`/courses/${slug}`);
  const next = state.lessons.find((l) => !state.done.has(l.id)) ?? state.lessons[0];
  if (!next) redirect("/dashboard");
  redirect(`/learn/${slug}/${next.id}`);
}
