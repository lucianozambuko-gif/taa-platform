import { createClient } from "@/lib/supabase/server";

export type Post = {
  id: string; slug: string; title: string; summary: string | null; body: string; category: string;
  meta_description: string | null; cta_label: string | null; cta_link: string | null;
  published: boolean; published_at: string | null; updated_at: string;
  image_url?: string | null; image_alt?: string | null;
};

export async function listPosts(category?: string) {
  const supabase = await createClient();
  let q = supabase.from("posts").select("*").eq("published", true).order("published_at", { ascending: false });
  if (category) q = q.eq("category", category);
  return ((await q).data ?? []) as Post[];
}

export async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return data as Post | null;
}
