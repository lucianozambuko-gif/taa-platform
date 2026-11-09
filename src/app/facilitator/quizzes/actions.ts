"use server";

import { revalidatePath } from "next/cache";
import { getUserAndProfile } from "@/lib/supabase/server";
import { textToQuiz } from "@/lib/quizText";

export type QuizEditState = { error?: string; message?: string };

/** Saves new quiz questions. The database checks the person teaches the course (or is a content editor or admin). */
export async function saveQuizQuestions(_: QuizEditState, fd: FormData): Promise<QuizEditState> {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return { error: "Please sign in again." };
  const lesson = String(fd.get("lesson") ?? "");
  const { quiz, error } = textToQuiz(String(fd.get("quiz") ?? ""));
  if (error) return { error };
  if (!quiz.length) return { error: "Add at least one question." };
  const { error: dbError } = await supabase.rpc("save_quiz", { lesson, questions: quiz });
  if (dbError) return { error: "Couldn't save. You can only change quizzes on courses you teach." };
  revalidatePath("/facilitator/quizzes");
  return { message: `Saved ${quiz.length} question${quiz.length === 1 ? "" : "s"}. Learners get the new questions on their next attempt.` };
}
