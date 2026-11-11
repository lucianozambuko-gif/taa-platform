"use client";

import { useState } from "react";

/** Copies a link to the clipboard (falls back to showing it when the browser refuses). */
export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1800); } catch { window.prompt("Copy this link", url); }
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
