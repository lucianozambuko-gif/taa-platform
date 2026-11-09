import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDuty, type DutyTeam } from "@/lib/duty";
import { waDirect } from "@/lib/format";

/** Routes a WhatsApp chat to whoever is on duty for that team, and counts it for the dashboard. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const team = (url.searchParams.get("team") ?? "general") as DutyTeam;
  const message = (url.searchParams.get("m") ?? "Hi Training Africa Academy").slice(0, 500);
  const duty = await getDuty();
  const slot = duty[team]?.on && duty[team]?.phone ? duty[team] : duty.general?.on && duty.general?.phone ? duty.general : null;
  const number = slot?.phone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  try {
    const supabase = await createClient();
    await supabase.from("site_events").insert({ kind: "whatsapp_routed", label: `${team}${slot ? `:${slot.name}` : ":main"}`, path: (req.headers.get("referer") ?? "").replace(/^https?:\/\/[^/]+/, "").slice(0, 200) || null });
  } catch {}
  return NextResponse.redirect(waDirect(number, message), 302);
}
