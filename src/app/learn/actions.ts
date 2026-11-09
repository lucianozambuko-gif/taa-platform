"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizQuestion } from "@/lib/types";

async function record(lessonId: string, score: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Row-level security only allows this for courses the learner is enrolled in.
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ user_id: user.id, lesson_id: lessonId, score, completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error("Could not save your progress.");
}

/** Marks a video or download lesson complete, then moves to the next lesson. */
export async function completeLesson(formData: FormData) {
  const lessonId = String(formData.get("lesson") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const next = String(formData.get("next") ?? "");
  await record(lessonId, null);
  revalidatePath(`/learn/${slug}`, "layout");
  redirect(next ? `/learn/${slug}/${next}` : `/learn/${slug}/${lessonId}`);
}

export type QuizState = { score?: number; passed?: boolean; correct?: number[]; error?: string };

/** Marks a quiz on the server (answers never reach the browser) and records a pass at 70% or more. */
export async function submitQuiz(_: QuizState, formData: FormData): Promise<QuizState> {
  const lessonId = String(formData.get("lesson") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_content").select("quiz").eq("lesson_id", lessonId).maybeSingle();
  const quiz = (data?.quiz ?? []) as QuizQuestion[];
  if (!quiz.length) return { error: "This quiz isn't available. Check that you're enrolled." };
  let right = 0;
  quiz.forEach((q, i) => {
    if (Number(formData.get(`q${i}`)) === q.a) right++;
  });
  const score = Math.round((right / quiz.length) * 100);
  const passed = score >= 70;
  // Every attempt is kept (passed or not) so facilitators can see who is struggling and which questions are missed.
  const { data: { user } } = await supabase.auth.getUser();
  if (user)
    await supabase.from("quiz_attempts").insert({
      user_id: user.id, lesson_id: lessonId, score, passed,
      answers: quiz.map((_, i) => (formData.get(`q${i}`) == null ? null : Number(formData.get(`q${i}`)))),
    });
  if (passed) {
    await record(lessonId, score);
    revalidatePath(`/learn/${slug}`, "layout");
  }
  return { score, passed, correct: quiz.map((q) => q.a) };
}
