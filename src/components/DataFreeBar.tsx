"use client";

import { useEffect, useState } from "react";

const DF_URL = process.env.NEXT_PUBLIC_DATAFREE_URL ?? "";

/**
 * On the data-free address: says browsing is free and warns that videos, PayFast and WhatsApp leave it.
 * On the normal site with data saver on: offers the data-free address, once the Academy has one.
 */
export default function DataFreeBar() {
  const [mode, setMode] = useState<"" | "datafree" | "offer">("");
  useEffect(() => {
    const read = () => {
      const el = document.documentElement;
      let dismissed = false;
      try { dismissed = sessionStorage.getItem("taa-df-offer") === "no"; } catch {}
      setMode(el.dataset.datafree === "on" ? "datafree" : DF_URL && el.dataset.saver === "on" && !dismissed ? "offer" : "");
    };
    read();
    window.addEventListener("taa-display-change", read);
    return () => window.removeEventListener("taa-display-change", read);
  }, []);
  if (mode === "datafree")
    return (
      <div className="df-bar" role="region" aria-label="Data-free site">
        <span><b>Data-free site.</b> Browsing courses and studying here doesn’t use your data. Videos, payments and WhatsApp open outside it and use data.</span>
        <a href="?datafree=0">Normal site</a>
      </div>
    );
  if (mode === "offer")
    return (
      <div className="df-bar" role="region" aria-label="Data-free site">
        <span><b>Low on data?</b> Use the Academy’s data-free site: browsing and studying cost you nothing.</span>
        <span className="row" style={{ gap: 10 }}>
          <a href={DF_URL}>Open data-free site</a>
          <button type="button" className="linklike" onClick={() => { try { sessionStorage.setItem("taa-df-offer", "no"); } catch {} setMode(""); }}>Not now</button>
        </span>
      </div>
    );
  return null;
}
