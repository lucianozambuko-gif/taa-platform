"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { textToQuiz } from "@/lib/quizText";

async function requireEditor() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["admin", "content"].includes(profile?.role ?? "")) redirect("/");
  return { supabase, user };
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (courseId: string) => {
  revalidatePath(`/admin/courses/${courseId}/lessons`);
  revalidatePath("/courses", "layout");
  revalidatePath("/learn", "layout");
};

export async function addModule(fd: FormData) {
  const { supabase, user } = await requireEditor();
  const courseId = s(fd, "course_id");
  const title = s(fd, "title");
  if (!title) return;
  const { data: last } = await supabase.from("modules").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("modules").insert({ course_id: courseId, title, position: (last?.position ?? 0) + 1 });
  await supabase.from("courses").update({ has_lms: true }).eq("id", courseId);
  await supabase.from("audit_log").insert({ actor: user.id, action: "module_add", entity: "course", entity_id: courseId, detail: { title } });
  done(courseId);
}

export async function renameModule(fd: FormData) {
  const { supabase } = await requireEditor();
  await supabase.from("modules").update({ title: s(fd, "title") }).eq("id", s(fd, "id"));
  done(s(fd, "course_id"));
}

export async function deleteModule(fd: FormData) {
  const { supabase, user } = await requireEditor();
  await supabase.from("modules").delete().eq("id", s(fd, "id"));
  await supabase.from("audit_log").insert({ actor: user.id, action: "module_delete", entity: "course", entity_id: s(fd, "course_id") });
  done(s(fd, "course_id"));
}

/** Swaps position with the neighbour above or below (modules or lessons). */
export async function move(fd: FormData) {
  const { supabase } = await requireEditor();
  const table = s(fd, "table") === "lessons" ? "lessons" : "modules";
  const parentKey = table === "lessons" ? "module_id" : "course_id";
  const id = s(fd, "id");
  const dir = s(fd, "dir") === "up" ? -1 : 1;
  const { data: me } = await supabase.from(table).select(`id, position, ${parentKey}`).eq("id", id).single();
  if (!me) return;
  const parent = (me as Record<string, string>)[parentKey];
  const { data: siblings } = await supabase.from(table).select("id, position").eq(parentKey, parent).order("position");
  const list = siblings ?? [];
  const i = list.findIndex((x) => x.id === id);
  const other = list[i + dir];
  if (!other) return;
  // Positions are unique per parent, so park one row first.
  await supabase.from(table).update({ position: -1 }).eq("id", id);
  await supabase.from(table).update({ position: me.position }).eq("id", other.id);
  await supabase.from(table).update({ position: other.position }).eq("id", id);
  done(s(fd, "course_id"));
}

export async function addLesson(fd: FormData) {
  const { supabase } = await requireEditor();
  const moduleId = s(fd, "module_id");
  const title = s(fd, "title");
  const kind = s(fd, "kind");
  if (!title || !["video", "download", "quiz"].includes(kind)) return;
  const { data: last } = await supabase.from("lessons").select("position").eq("module_id", moduleId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data: lesson } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, title, kind, minutes: Number(s(fd, "minutes")) || 5, position: (last?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (lesson) await supabase.from("lesson_content").insert({ lesson_id: lesson.id });
  done(s(fd, "course_id"));
}

export async function deleteLesson(fd: FormData) {
  const { supabase } = await requireEditor();
  await supabase.from("lessons").delete().eq("id", s(fd, "id"));
  done(s(fd, "course_id"));
}

export type LessonState = { error?: string; message?: string };

export async function saveLesson(_: LessonState, fd: FormData): Promise<LessonState> {
  const { supabase, user } = await requireEditor();
  const id = s(fd, "id");
  const kind = s(fd, "kind");
  const title = s(fd, "title");
  if (!title) return { error: "Give the lesson a title." };
  const url = (k: string) => {
    const v = s(fd, k);
    return v && (/^https:\/\//.test(v) || v.startsWith("storage:")) ? v : v ? "BAD" : null;
  };
  const video = url("video_url");
  const captions = url("captions_url");
  const download = url("download_url");
  if ([video, captions, download].includes("BAD")) return { error: "Links must start with https:// (or be an uploaded file)." };
  let quiz = null;
  if (kind === "quiz") {
    const parsed = textToQuiz(s(fd, "quiz"));
    if (parsed.error) return { error: parsed.error };
    if (!parsed.quiz.length) return { error: "Add at least one question." };
    quiz = parsed.quiz;
  }
  const { error } = await supabase.from("lessons").update({ title, minutes: Number(s(fd, "minutes")) || 5 }).eq("id", id);
  if (error) return { error: error.message };
  const { error: e2 } = await supabase
    .from("lesson_content")
    .upsert({ lesson_id: id, video_url: video, captions_url: captions, download_url: download, body: s(fd, "body") || null, quiz });
  if (e2) return { error: e2.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: "lesson_save", entity: "lesson", entity_id: id, detail: { title } });
  done(s(fd, "course_id"));
  return { message: "Saved. Learners see the change straight away." };
}
