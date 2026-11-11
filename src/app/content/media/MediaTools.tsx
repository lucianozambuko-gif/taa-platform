"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const OK = /\.(jpe?g|png|webp|gif|svg|pdf)$/i;

/** Uploads a photo or PDF to the public site-media bucket (the database only lets content editors and admins do this). */
export function MediaUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!OK.test(file.name)) return setMsg({ ok: false, text: "Choose a photo (JPG, PNG, WebP) or a PDF." });
    if (file.size > 8 * 1024 * 1024) return setMsg({ ok: false, text: "That file is larger than 8 MB. Make it smaller and try again." });
    setBusy(true);
    setMsg(null);
    const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
    const path = `uploads/${Date.now().toString(36)}-${clean}`;
    const { error } = await createBrowserSupabase().storage.from("site-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setBusy(false);
    e.target.value = "";
    if (error) return setMsg({ ok: false, text: "The upload didn't go through. Check your connection and try again." });
    setMsg({ ok: true, text: "Uploaded. Copy its link below and paste it into a course or article." });
    router.refresh();
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Uploading…" : "Upload a photo or PDF"}
        <input type="file" accept="image/*,application/pdf" onChange={upload} disabled={busy} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      </label>
      {msg && <p className={msg.ok ? "small" : "form-error"} role="status" style={msg.ok ? { color: "var(--good)", margin: 0 } : { margin: 0 }}>{msg.text}</p>}
    </div>
  );
}
