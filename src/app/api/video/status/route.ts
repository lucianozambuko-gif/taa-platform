import { NextResponse } from "next/server";
import { getUserAndProfile } from "@/lib/supabase/server";
import { STATUS_TEXT, getVideo, thumbnailUrl } from "@/lib/bunny";

export const dynamic = "force-dynamic";

/** Processing status of an uploaded video, for the lesson editor. Staff only. */
export async function GET(req: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !["admin", "content", "facilitator"].includes(profile?.role ?? "")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  try {
    const v = await getVideo(id);
    return NextResponse.json({
      status: v.status,
      text: STATUS_TEXT[v.status] ?? "Unknown",
      progress: v.encodeProgress ?? null,
      ready: v.status === 4,
      minutes: v.length ? Math.max(1, Math.round(v.length / 60)) : null,
      resolutions: v.availableResolutions ?? null,
      thumbnail: v.status === 4 ? thumbnailUrl(v.guid, v.thumbnailFileName ?? undefined) : null,
    });
  } catch (e) {
    console.error("bunny status", e);
    return NextResponse.json({ error: "Couldn't reach Bunny Stream." }, { status: 502 });
  }
}
