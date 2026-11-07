"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const KEY = "taa-cookie-consent";

/** Loads Google Analytics only after the visitor accepts analytics cookies (POPIA / F12 cookie controls). */
export default function Analytics({ gaId }: { gaId?: string }) {
  const [consent, setConsent] = useState<"yes" | "no" | null | "unknown">("unknown");
  useEffect(() => {
    try {
      setConsent((localStorage.getItem(KEY) as "yes" | "no" | null) ?? null);
    } catch {
      setConsent(null);
    }
  }, []);
  const choose = (v: "yes" | "no") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setConsent(v);
  };
  return (
    <>
      {gaId && consent === "yes" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {consent === null && (
        <div className="cookie-bar" role="region" aria-label="Cookie choice">
          <p>We use analytics cookies to see which courses and pages help people most. You can say no and the site works the same.</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => choose("yes")}>Accept analytics</button>
            <button className="btn btn-ghost btn-sm" onClick={() => choose("no")}>No thanks</button>
          </div>
        </div>
      )}
    </>
  );
}
