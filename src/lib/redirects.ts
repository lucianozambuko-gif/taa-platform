import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** For a page that doesn't exist: follow a staff-added redirect for this path, otherwise show the 404 page. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const candidates = [...new Set([path, path.toLowerCase(), path.replace(/\/+$/, ""), path.replace(/\.(html?|php|aspx?)$/i, "")])].filter(Boolean);
  let target: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("redirects").select("from_path, to_path").in("from_path", candidates).limit(1).maybeSingle();
    if (data) {
      target = data.to_path;
      await supabase.rpc("redirect_hit", { p: data.from_path });
    }
  } catch {}
  if (target) permanentRedirect(target);
  notFound();
}
