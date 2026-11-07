import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Any URL the new site doesn't have: send it on if staff added a redirect for it, otherwise show the 404 page. */
export default async function LegacyRedirect({ params }: { params: Promise<{ legacy: string[] }> }) {
  const { legacy } = await params;
  const path = "/" + legacy.map((p) => decodeURIComponent(p)).join("/");
  const candidates = [...new Set([path, path.toLowerCase(), path.replace(/\.(html?|php|aspx?)$/i, "")])];
  let target: string | null = null;
  let matched = path;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("redirects").select("from_path, to_path").in("from_path", candidates).limit(1).maybeSingle();
    if (data) {
      target = data.to_path;
      matched = data.from_path;
      await supabase.rpc("redirect_hit", { p: matched });
    }
  } catch {}
  if (target) permanentRedirect(target);
  notFound();
}
