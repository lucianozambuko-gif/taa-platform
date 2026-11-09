"use client";

import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registers the offline service worker and offers "Install the app" where the phone supports it. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // After sign-out, remove saved pages so the next person on this phone can't open them offline.
    if (location.search.includes("signedout=1")) navigator.serviceWorker.ready.then((r) => r.active?.postMessage("clear")).catch(() => {});
  }, []);
  return null;
}

export default function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return setDone(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (done || (!evt && !ios)) return null;
  return (
    <div className="panel row install" style={{ justifyContent: "space-between", gap: 10 }}>
      <span>
        <b>Install the app</b>
        <br />
        <span className="small muted">
          {evt ? "Open your courses from your home screen. Recently opened lessons work without signal." : "On iPhone: tap Share, then “Add to Home Screen”."}
        </span>
      </span>
      {evt && (
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            await evt.prompt();
            if ((await evt.userChoice).outcome === "accepted") setDone(true);
          }}
        >
          Install
        </button>
      )}
    </div>
  );
}
