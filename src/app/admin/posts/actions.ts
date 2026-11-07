"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";

export type PostState = { error?: string; message?: string };

async function requireEditor() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["admin", "content"].includes(profile?.role ?? "")) redirect("/");
  return { supabase, user };
}

export async function savePost(_: PostState, fd: FormData): Promise<PostState> {
  const { supabase, user } = await requireEditor();
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const id = s("id");
  const title = s("title");
  if (!title) return { error: "Add a title." };
  const slug = (s("slug") || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  const ctaLink = s("cta_link");
  if (ctaLink && !/^(\/|https:\/\/)/.test(ctaLink)) return { error: "The button link must start with / or https://" };
  const published = fd.get("published") === "on";
  const { data: before } = id ? await supabase.from("posts").select("published_at").eq("id", id).maybeSingle() : { data: null };
  const row = {
    slug, title,
    summary: s("summary") || null,
    body: s("body"),
    category: s("category") || "News",
    meta_description: s("meta_description").slice(0, 300) || null,
    cta_label: s("cta_label") || null,
    cta_link: ctaLink || null,
    published,
    published_at: published ? before?.published_at ?? new Date().toISOString() : before?.published_at ?? null,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("posts").update(row).eq("id", id).select("id").single()
    : await supabase.from("posts").insert({ ...row, author: user.id }).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Another article already uses that web address." : result.error.message };
  await supabase.from("audit_log").insert({ actor: user.id, action: id ? "post_update" : "post_create", entity: "post", entity_id: result.data.id, detail: { title, published } });
  revalidatePath("/news", "layout");
  revalidatePath("/admin");
  if (!id) redirect(`/admin/posts/${result.data.id}?created=1`);
  return { message: published ? "Saved and published." : "Saved as a draft." };
}

export async function deletePost(fd: FormData) {
  const { supabase, user } = await requireEditor();
  const id = String(fd.get("id") ?? "");
  await supabase.from("posts").delete().eq("id", id);
  await supabase.from("audit_log").insert({ actor: user.id, action: "post_delete", entity: "post", entity_id: id });
  revalidatePath("/news", "layout");
  redirect("/admin?tab=content");
}
