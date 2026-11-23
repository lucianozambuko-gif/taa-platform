"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, isStaffRole } from "@/lib/roles";

/**
 * Moves the signed-in person into another workspace they have been given (for example from
 * Teaching to Sales). The database checks the role was granted by an admin and logs the switch.
 * Permissions follow the active workspace, so each workspace only shows its own work.
 */
export async function switchRole(fd: FormData) {
  const target = String(fd.get("role") ?? "");
  if (!isStaffRole(target)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("switch_role", { target });
  if (error) {
    console.error("switch_role", error.message);
    redirect("/account?switch=denied");
  }
  revalidatePath("/", "layout");
  redirect(homeFor(target));
}
