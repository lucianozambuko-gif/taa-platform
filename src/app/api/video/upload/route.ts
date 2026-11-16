import { NextResponse } from "next/server";
import { getUserAndProfile } from "@/lib/supabase/server";
import { bunnyConfig, startUpload } from "@/lib/bunny";

export const dynamic = "force-dynamic";
const UPLOADERS = ["admin", "content", "facilitator"];

/** Signs a direct browser-to-Bunny upload. The video file itself never passes through this server. */
export async function POST(req: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !UPLOADERS.includes(profile?.role ?? "")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!bunnyConfig()) return NextResponse.json({ error: "Video hosting (Bunny Stream) isn't set up yet." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim().slice(0, 200) || "Lesson video";
  try {
    return NextResponse.json(await startUpload(title));
  } catch (e) {
    console.error("bunny upload start", e);
    return NextResponse.json({ error: "Couldn't start the upload. Try again in a minute." }, { status: 502 });
  }
}
