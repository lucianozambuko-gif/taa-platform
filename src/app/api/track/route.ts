import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Counts brochure downloads and WhatsApp clicks for the back-office dashboard. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kind = body?.kind;
    if (kind !== "brochure_download" && kind !== "whatsapp_click") return new NextResponse(null, { status: 204 });
    const supabase = await createClient();
    await supabase.from("site_events").insert({
      kind,
      label: String(body.label ?? "").slice(0, 80) || null,
      path: String(body.path ?? "").slice(0, 200) || null,
    });
  } catch {}
  return new NextResponse(null, { status: 204 });
}
