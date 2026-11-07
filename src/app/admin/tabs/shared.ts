import type { createClient } from "@/lib/supabase/server";

export type DB = Awaited<ReturnType<typeof createClient>>;
export const when = (iso: string) => new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
export const SELECT = { padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--ink)", font: "inherit", fontSize: ".88rem" } as const;
export const waLink = (phone: string | null | undefined, text: string) =>
  phone ? `https://wa.me/27${phone.replace(/\D/g, "").replace(/^27/, "").replace(/^0/, "")}?text=${encodeURIComponent(text)}` : null;
