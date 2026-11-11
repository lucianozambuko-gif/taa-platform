"use client";

import { useEffect, useState } from "react";

type Status = { saved: number; total: number; bytes?: number; saving?: boolean };

/** "Save this course to my phone": keeps every lesson page so the course opens with no signal. */
export default function SaveCourse({ slug, urls }: { slug: string; urls: string[] }) {
  const [sw, setSw] = useState<ServiceWorker | null>(null);
  const [st, setSt] = useState<Status | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.course !== slug) return;
      if (d.type === "course-status") setSt({ saved: d.saved, total: d.total });
      if (d.type === "save-progress") setSt({ saved: d.done, total: d.total, bytes: d.bytes, saving: true });
      if (d.type === "save-done") setSt({ saved: d.done, total: d.total, bytes: d.bytes });
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    navigator.serviceWorker.ready.then((r) => {
      setSw(r.active);
      r.active?.postMessage({ type: "course-status", course: slug, urls });
    });
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [slug, urls]);

  if (!sw || !st) return null;
  const all = st.saved >= st.total && st.total > 0;
  const kb = st.bytes ? ` · ${Math.max(1, Math.round(st.bytes / 1024))} KB` : "";
  return (
    <div className="save-course">
      {st.saving ? (
        <p className="small"><b>Saving to this phone…</b> {st.saved} of {st.total}{kb}</p>
      ) : all ? (
        <>
          <p className="small"><b>✓ Saved on this phone.</b> Every lesson opens with no signal{kb}.</p>
          <button className="linkish small" onClick={() => sw.postMessage({ type: "remove-course", course: slug, urls })}>Remove from phone</button>
        </>
      ) : (
        <>
          <p className="small muted">Going somewhere with no signal? Save the lessons while you have Wi-Fi.</p>
          <button className="btn btn-ghost btn-sm" onClick={() => sw.postMessage({ type: "save-course", course: slug, urls })}>Save course to my phone</button>
        </>
      )}
    </div>
  );
}
