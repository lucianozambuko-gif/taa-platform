"use client";

import { useActionState } from "react";
import type { Post } from "@/lib/posts";
import { savePost, type PostState } from "../actions";

export default function PostForm({ post }: { post?: Post }) {
  const [state, action, pending] = useActionState<PostState, FormData>(savePost, {});
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="field"><label>Title</label><input name="title" required defaultValue={post?.title} /></div>
        <div className="grid g2" style={{ gap: 10 }}>
          <div className="field"><label>Web address</label><input name="slug" defaultValue={post?.slug} placeholder="made from the title if empty" /></div>
          <div className="field">
            <label>Category</label>
            <input name="category" list="post-cats" defaultValue={post?.category ?? "News"} />
            <datalist id="post-cats"><option>News</option><option>Intakes</option><option>Employers</option><option>Resources</option><option>Learner stories</option></datalist>
          </div>
        </div>
        <div className="field"><label>Summary (shown on the news page)</label><input name="summary" defaultValue={post?.summary ?? ""} /></div>
        <div className="grid g2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="pf-img">Photo link</label><input id="pf-img" name="image_url" defaultValue={post?.image_url ?? ""} placeholder="https://… (from the Academy photo library)" /></div>
          <div className="field"><label htmlFor="pf-alt">Photo description (for screen readers)</label><input id="pf-alt" name="image_alt" defaultValue={post?.image_alt ?? ""} placeholder="e.g. Learners practising with a floor scrubber" /></div>
        </div>
        <div className="field">
          <label>Article</label>
          <textarea name="body" rows={14} defaultValue={post?.body ?? ""} />
          <span className="small muted">Leave a blank line between paragraphs. Start a line with ## for a heading and - for a bullet point.</span>
        </div>
      </div>
      <div className="panel stack" style={{ gap: 10 }}>
        <h3>Search and call to action</h3>
        <div className="field"><label>Search description (Google snippet, up to 160 characters)</label><input name="meta_description" maxLength={300} defaultValue={post?.meta_description ?? ""} /></div>
        <div className="grid g2" style={{ gap: 10 }}>
          <div className="field"><label>Button text</label><input name="cta_label" defaultValue={post?.cta_label ?? ""} placeholder="e.g. View the course" /></div>
          <div className="field"><label>Button link</label><input name="cta_link" defaultValue={post?.cta_link ?? ""} placeholder="/courses/…" /></div>
        </div>
        <label className="small"><input type="checkbox" name="published" defaultChecked={post?.published} /> Published (visible on the website)</label>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save article"}</button></div>
    </form>
  );
}
