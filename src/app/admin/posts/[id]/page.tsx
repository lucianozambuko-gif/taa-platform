import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Post } from "@/lib/posts";
import { getUserAndProfile } from "@/lib/supabase/server";
import { deletePost } from "../actions";
import PostForm from "./PostForm";

export const metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin");
  if (!["admin", "content"].includes(profile?.role ?? "")) redirect("/");
  let post: Post | undefined;
  if (id !== "new") {
    const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    post = data as Post;
  }
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18, maxWidth: 860 }}>
        <div className="crumbs"><Link href="/admin?tab=content">Back office · Site content</Link><span>/</span><span>{post ? post.title : "New article"}</span></div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "clamp(1.6rem,3.4vw,2.2rem)" }}>{post ? "Edit article" : "New article"}</h1>
          {post?.published && <Link className="btn btn-ghost btn-sm" href={`/news/${post.slug}`} target="_blank">View on site</Link>}
        </div>
        {created && <p className="form-ok">Article created.</p>}
        <PostForm post={post} />
        {post && <form action={deletePost}><input type="hidden" name="id" value={post.id} /><button className="btn btn-ghost btn-sm">Delete article</button></form>}
      </div>
    </section>
  );
}
