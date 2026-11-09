"use server";

import { revalidatePath } from "next/cache";
import { getUserAndProfile } from "@/lib/supabase/server";
import { textToQuiz } from "@/lib/quizText";
import { notify } from "@/lib/notify";

export type ProposalState = { error?: string; message?: string };
const KINDS = ["video", "quiz", "download"];
const clean = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").trim().slice(0, max);

/** A facilitator's suggestion: a new lesson or changes to one. Nothing changes for learners until it's approved. */
export async function proposeLesson(_: ProposalState, fd: FormData): Promise<ProposalState> {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return { error: "Please sign in again." };
  const courseId = clean(fd.get("course_id"), 64);
  const lessonId = clean(fd.get("lesson_id"), 64) || null;
  const kind = clean(fd.get("kind"), 20);
  const title = clean(fd.get("title"), 160);
  const minutes = Math.max(1, Math.min(600, Number(fd.get("minutes")) || 5));
  if (!title) return { error: "Give the lesson a title." };
  if (!KINDS.includes(kind)) return { error: "Choose a lesson type." };
  const moduleSel = clean(fd.get("module_id"), 64);
  const newModule = clean(fd.get("new_module_title"), 120);
  if (!lessonId && moduleSel === "new" && !newModule) return { error: "Name the new module, or pick an existing one." };

  const content: Record<string, unknown> = {};
  for (const k of ["video_url", "captions_url", "download_url", "body"]) {
    const v = clean(fd.get(k), 8000);
    if (v) content[k] = v;
  }
  if (kind === "quiz") {
    const { quiz, error } = textToQuiz(String(fd.get("quiz") ?? ""));
    if (error) return { error };
    if (!quiz.length) return { error: "Add at least one quiz question." };
    content.quiz = quiz;
  }
  if (kind === "video" && !lessonId && !content.video_url) return { error: "Add the video: upload an MP4 or paste a YouTube or Vimeo link." };
  if (kind === "download" && !lessonId && !content.download_url) return { error: "Upload the PDF or worksheet." };
  if (lessonId && Object.keys(content).length === 0 && !fd.get("changed_title")) {
    // An edit with no content changes is still allowed for title/minutes only.
  }

  const { error } = await supabase.from("lesson_proposals").insert({
    course_id: courseId, action: lessonId ? "edit_lesson" : "new_lesson", lesson_id: lessonId,
    module_id: !lessonId && moduleSel && moduleSel !== "new" ? moduleSel : null,
    new_module_title: !lessonId && moduleSel === "new" ? newModule : null,
    title, kind, minutes, content, message: clean(fd.get("message"), 1000) || null, proposed_by: user.id,
  });
  if (error) return { error: "Couldn't send it. You can only suggest lessons for courses you teach." };
  await notify({
    audience: "staff", kind: "lesson_proposal", whatsapp: false,
    subject: `Lesson ${lessonId ? "changes" : "suggestion"} to approve: ${title}`,
    body: `${profile?.full_name ?? "A facilitator"} suggested ${lessonId ? "changes to" : "a new"} ${kind} lesson “${title}”. Review it in the back office under Approvals.`,
    link: "/admin?tab=approvals",
  });
  revalidatePath("/facilitator/lessons");
  return { message: "Sent for approval. You’ll be notified when an admin or content editor has reviewed it." };
}

export async function withdrawProposal(fd: FormData) {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return;
  await supabase.from("lesson_proposals").update({ status: "withdrawn" }).eq("id", String(fd.get("id") ?? "")).eq("proposed_by", user.id);
  revalidatePath("/facilitator/lessons");
}
