"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export type AuthState = { error?: string; message?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "That email and password don't match an account. Check them and try again." };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  if (formData.get("popia") !== "on") return { error: "Please accept the privacy notice to create your account." };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      data: {
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        popia_consent: "true",
        marketing_opt_in: formData.get("marketing") === "on",
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${next}`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account, then log in." };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
