import { createClient } from "@/lib/supabase/server";
import { bunnyGuid, getVideo, isBunnyRef, offlineMp4Candidates } from "@/lib/bunny";

export const dynamic = "force-dynamic";

/**
 * Small MP4 copy of a lesson video for "Save for offline". Same-origin, so the phone can
 * keep it with the course. Row-level security means only enrolled learners (and staff)
 * can read the lesson, so only they get the file.
 */
export async function GET(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in", { status: 401 });
  const { data: content } = await supabase.from("lesson_content").select("video_url").eq("lesson_id", lessonId).maybeSingle();
  const ref = content?.video_url;
  if (!ref) return new Response("Not found", { status: 404 });

  let sources: string[] = [];
  if (isBunnyRef(ref)) {
    const guid = bunnyGuid(ref);
    const v = await getVideo(guid).catch(() => null);
    sources = offlineMp4Candidates(guid, v?.availableResolutions).map((c) => c.url);
  } else if (ref.startsWith("storage:")) {
    const { data } = await supabase.storage.from("lesson-files").createSignedUrl(ref.slice(8), 600);
    if (data?.signedUrl) sources = [data.signedUrl];
  }
  if (!sources.length) return new Response("This video can't be saved for offline use", { status: 404 });

  const range = req.headers.get("range");
  for (const url of sources) {
    const r = await fetch(url, { headers: range ? { range } : {}, cache: "no-store" }).catch(() => null);
    if (!r || !(r.ok || r.status === 206) || !r.body) continue;
    const h = new Headers({ "content-type": "video/mp4", "cache-control": "private, no-store", "accept-ranges": "bytes" });
    for (const k of ["content-length", "content-range"]) { const v = r.headers.get(k); if (v) h.set(k, v); }
    return new Response(r.body, { status: r.status, headers: h });
  }
  return new Response("The offline copy isn't ready yet. Turn on MP4 fallback in the Bunny library.", { status: 404 });
}
