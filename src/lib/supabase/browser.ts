"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client acting as the signed-in user, used only for direct file uploads to private storage. */
export function createBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
