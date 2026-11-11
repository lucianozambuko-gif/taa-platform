"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizQuestion } from "@/lib/types";

async function record(lessonId: string, score: number | null, at?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Row-level security only allows this for courses the learner is enrolled in.
  const when = at && !Number.isNaN(Date.parse(at)) && Date.parse(at) <= Date.now() ? new Date(at).toISOString() : new Date().toISOString();
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ user_id: user.id, lesson_id: lessonId, score, completed_at: when }, { onConflict: "user_id,lesson_id" });
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

export type QuizState = { score?: number; passed?: boolean; correct?: number[]; marks?: boolean[]; review?: "off" | "mine" | "full"; error?: string };

/** Marks a quiz on the server (answers never reach the browser), keeps the attempt and records a pass at 70% or more. */
async function markQuiz(lessonId: string, answers: (number | null)[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_content").select("quiz, quiz_review").eq("lesson_id", lessonId).maybeSingle();
  const quiz = (data?.quiz ?? []) as QuizQuestion[];
  if (!quiz.length) return null;
  // The teacher decides how much the learner sees afterwards: score only, right/wrong, or the correct answers too.
  const review = ((data?.quiz_review as string) ?? "full") as "off" | "mine" | "full";
  let right = 0;
  quiz.forEach((q, i) => {
    if (answers[i] === q.a) right++;
  });
  const score = Math.round((right / quiz.length) * 100);
  const passed = score >= 70;
  // Every attempt is kept (passed or not) so facilitators can see who is struggling and which questions are missed.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("quiz_attempts").insert({ user_id: user.id, lesson_id: lessonId, score, passed, answers: quiz.map((_, i) => answers[i] ?? null) });
  if (passed) await record(lessonId, score);
  return {
    score,
    passed,
    review,
    marks: review === "off" ? undefined : quiz.map((q, i) => answers[i] === q.a),
    correct: review === "full" ? quiz.map((q) => q.a) : undefined,
  };
}

export async function submitQuiz(_: QuizState, formData: FormData): Promise<QuizState> {
  const lessonId = String(formData.get("lesson") ?? "");
  const slug = String(formData.get("slug") ?? "");
  // Unanswered questions are simply missing from the form; markQuiz counts them as wrong.
  const answers: (number | null)[] = Array.from({ length: 100 }, (_, i) => (formData.get(`q${i}`) == null ? null : Number(formData.get(`q${i}`))));
  const res = await markQuiz(lessonId, answers);
  if (!res) return { error: "This quiz isn't available. Check that you're enrolled." };
  if (res.passed) revalidatePath(`/learn/${slug}`, "layout");
  return res;
}

export type OfflineItem =
  | { kind: "lesson"; lesson: string; slug: string; at: string }
  | { kind: "quiz"; lesson: string; slug: string; at: string; title?: string; answers: (number | null)[] };

/** Saves progress and quiz answers a learner recorded while offline. Returns one line per item for the learner. */
export async function syncOffline(items: OfflineItem[]): Promise<{ synced: number; results: string[] }> {
  const results: string[] = [];
  let synced = 0;
  const slugs = new Set<string>();
  for (const it of (items ?? []).slice(0, 100)) {
    try {
      if (it.kind === "lesson") {
        await record(String(it.lesson), null, it.at);
        synced++;
      } else if (it.kind === "quiz") {
        const res = await markQuiz(String(it.lesson), (it.answers ?? []).map((a) => (a == null ? null : Number(a))));
        if (res) {
          synced++;
          results.push(`${it.title ?? "Quiz"}: ${res.score}%, ${res.passed ? "passed" : "below 70%, try again"}`);
        }
      }
      slugs.add(String(it.slug));
    } catch {}
  }
  slugs.forEach((s) => revalidatePath(`/learn/${s}`, "layout"));
  revalidatePath("/dashboard");
  return { synced, results };
}
