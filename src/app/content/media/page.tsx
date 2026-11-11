import { redirect } from "next/navigation";
import { WorkHead } from "@/components/WorkBits";
import { homeFor } from "@/lib/roles";
import { getUserAndProfile } from "@/lib/supabase/server";
import CopyLink from "@/components/CopyLink";
import { MediaUpload } from "./MediaTools";

export const metadata = { title: "Media library" };
export const dynamic = "force-dynamic";

type F = { name: string; folder: string; url: string; size: number | null; at: string | null };

/** Photos and PDFs for course pages, brochures and articles: upload once, then paste the link where it is needed. */
export default async function MediaLibrary() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/content/media");
  const role = profile?.role ?? "learner";
  if (role !== "content" && role !== "admin") redirect(homeFor(role));

  const bucket = supabase.storage.from("site-media");
  const files: F[] = [];
  let failed = false;
  for (const folder of ["uploads", "gallery"]) {
    try {
      const { data, error } = await bucket.list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) { failed = true; continue; }
      for (const f of data ?? []) {
        // Skip folders and the small phone-size copies of gallery photos.
        if (!f.id || /-sm\.webp$/.test(f.name)) continue;
        files.push({ name: f.name, folder, url: bucket.getPublicUrl(`${folder}/${f.name}`).data.publicUrl, size: (f.metadata as { size?: number } | null)?.size ?? null, at: f.created_at ?? null });
      }
    } catch { failed = true; }
  }
  const isImage = (n: string) => /\.(jpe?g|png|webp|gif|svg)$/i.test(n);
  const kb = (n: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  return (
    <>
      <WorkHead eyebrow="Content studio" title="Media library" />
      <div className="panel stack" style={{ gap: 10 }}>
        <h2 className="h3">Add a file</h2>
        <p className="small muted" style={{ margin: 0 }}>Photos for course cards and articles, and brochure PDFs. After uploading, copy the link and paste it into the “Photo link” or “Brochure PDF link” field of a course or article. Only use photos the Academy owns or has permission to use, and add a short description (alt text) where the form asks for it.</p>
        <MediaUpload />
      </div>
      <div className="panel stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="h3">Files on the website</h2>
          <span className="small muted">{files.length} {files.length === 1 ? "file" : "files"}</span>
        </div>
        {failed && !files.length && <p className="small muted">The file list could not be loaded just now. Uploading still works; refresh the page to try again.</p>}
        {!failed && !files.length && <p className="small muted">No files yet. Upload the first photo or brochure above.</p>}
        <div className="media-grid">
          {files.map((f) => (
            <div className="media-item" key={f.folder + f.name}>
              <a className="thumb" href={f.url} target="_blank" rel="noopener" aria-label={`Open ${f.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {isImage(f.name) ? <img src={f.url} alt="" loading="lazy" /> : <span>PDF</span>}
              </a>
              <span className="name" title={f.name}>{f.name}</span>
              <span className="row" style={{ gap: 6, justifyContent: "space-between", flexWrap: "nowrap" }}>
                <span className="small muted">{f.folder === "gallery" ? "Gallery" : "Upload"}{f.size ? ` · ${kb(f.size)}` : ""}</span>
                <CopyLink url={f.url} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
