import { createClient } from "@/lib/supabase/server";

import type { Duty } from "./dutyTeams";
export { TEAM_LABEL, type Duty, type DutyTeam } from "./dutyTeams";

/** WhatsApp duty roster set by sales staff; empty slots fall back to the Academy's main number. */
export async function getDuty(): Promise<Partial<Duty>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("value").eq("key", "whatsapp_duty").maybeSingle();
    return (data?.value as Partial<Duty>) ?? {};
  } catch {
    return {};
  }
}
