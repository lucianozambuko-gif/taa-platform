"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; message?: string };

export async function saveAccount(_: AccountState, fd: FormData): Promise<AccountState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const name = String(fd.get("full_name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const language = String(fd.get("language") ?? "en");
  if (!name) return { error: "Enter your name." };
  if (phone && !/^[+\d][\d\s-]{8,15}$/.test(phone)) return { error: "Enter a valid mobile number." };
  if (!["en", "zu", "st"].includes(language)) return { error: "Choose a language." };
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name, phone: phone || null, whatsapp_opt_in: fd.get("whatsapp") === "on", marketing_opt_in: fd.get("marketing") === "on", language })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save. Please try again." };
  (await cookies()).set("taa-lang", language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

/** Language switch for visitors (no account needed). */
export async function setLanguage(fd: FormData) {
  const language = String(fd.get("language") ?? "en");
  if (!["en", "zu", "st"].includes(language)) return;
  (await cookies()).set("taa-lang", language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ language }).eq("id", user.id);
  revalidatePath("/", "layout");
}
