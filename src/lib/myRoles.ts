// Server-only: the staff roles the signed-in person holds, for the workspace switcher.
import { cache } from "react";
import { getUserAndProfile } from "@/lib/supabase/server";
import { WORKSPACE_LABEL, homeFor, sortRoles, type Role, type StaffRole } from "@/lib/roles";

export type SwitchOption = { role: StaffRole; label: string; home: string; active: boolean };

/** Every workspace the person can switch to (only when they hold two or more staff roles). */
export const getSwitchOptions = cache(async (): Promise<SwitchOption[]> => {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return [];
  const { data, error } = await supabase.from("staff_roles").select("role").eq("user_id", user.id);
  if (error || !data) return [];
  const roles = sortRoles(data.map((r) => r.role as string));
  if (roles.length < 2) return [];
  const active = profile?.role as Role | undefined;
  return roles.map((role) => ({ role, label: WORKSPACE_LABEL[role], home: homeFor(role), active: role === active }));
});
