"use client";

import { useEffect, useRef, useState } from "react";
import { setLanguage } from "@/app/account/actions";

type Prefs = { text: "md" | "lg" | "xl"; contrast: "normal" | "high"; saver: "on" | "off" };
const KEY = "taa-display";
const DEFAULTS: Prefs = { text: "md", contrast: "normal", saver: "off" };

export const FONTS_URL = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";
const DF_HOST = process.env.NEXT_PUBLIC_DATAFREE_HOST ?? "";

/** Web fonts are about 150 KB, so data saver skips them and uses the phone's own fonts. */
function loadFonts() {
  if (document.getElementById("taa-fonts")) return;
  const l = document.createElement("link");
  l.id = "taa-fonts";
  l.rel = "stylesheet";
  l.href = FONTS_URL;
  document.head.appendChild(l);
}

function apply(p: Prefs) {
  const el = document.documentElement;
  el.dataset.text = p.text;
  el.dataset.contrast = p.contrast;
  el.dataset.saver = el.dataset.datafree === "on" ? "on" : p.saver;
  if (el.dataset.saver !== "on") loadFonts();
}

/**
 * Runs before first paint (in <head>) so saved settings don't flash.
 * Data saver turns on by itself when the phone asks for it (Save-Data) or the connection is 2G, and always on the data-free address
 * (a separate host such as a Datafree/Moya subdomain, or ?datafree=1 to preview it). Fonts load only when data saver is off.
 */
export const displayBootScript = `try{var e=document.documentElement,c=navigator.connection,q=location.search,p=null;try{p=JSON.parse(localStorage.getItem('${KEY}')||'null')}catch(x){}
if(/[?&]datafree=0/.test(q))document.cookie='taa-df=;path=/;max-age=0';
var df=(${JSON.stringify(DF_HOST)}&&location.hostname===${JSON.stringify(DF_HOST)})||/[?&]datafree=1/.test(q)||(/(^|; )taa-df=1/.test(document.cookie)&&!/[?&]datafree=0/.test(q));
if(df)document.cookie='taa-df=1;path=/;max-age=86400';
if(!p){p={text:'md',contrast:'normal',saver:(c&&(c.saveData||/2g/.test(c.effectiveType||'')))?'on':'off'}}
e.dataset.text=p.text;e.dataset.contrast=p.contrast;e.dataset.datafree=df?'on':'off';e.dataset.saver=df?'on':p.saver;
if(e.dataset.saver!=='on'){var l=document.createElement('link');l.id='taa-fonts';l.rel='stylesheet';l.href='${FONTS_URL}';document.head.appendChild(l)}}catch(x){}`;

/** Text size, high contrast and data saver (RFQ section 6: scalable text, lower-bandwidth learners). */
export default function DisplaySettings({ lang = "en" }: { lang?: string }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [df, setDf] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.documentElement;
    setDf(el.dataset.datafree === "on");
    setPrefs({
      text: (el.dataset.text as Prefs["text"]) || "md",
      contrast: (el.dataset.contrast as Prefs["contrast"]) || "normal",
      saver: (el.dataset.saver as Prefs["saver"]) || "off",
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event("taa-display-change"));
  };

  return (
    <div className="disp-wrap" ref={ref}>
      <button className="disp-btn" aria-expanded={open} aria-controls="disp-panel" aria-label="Display settings" onClick={() => setOpen((o) => !o)} type="button">
        Aa
      </button>
      {open && (
        <div className="disp-panel" id="disp-panel" role="dialog" aria-label="Display settings">
          <div className="stack" style={{ gap: 6 }}>
            <span className="flabel">Text size</span>
            <div className="seg" role="group" aria-label="Text size">
              {(["md", "lg", "xl"] as const).map((t, i) => (
                <button key={t} type="button" aria-pressed={prefs.text === t} onClick={() => update({ text: t })} style={{ fontSize: `${0.85 + i * 0.12}rem` }}>
                  {["Standard", "Large", "Larger"][i]}
                </button>
              ))}
            </div>
          </div>
          <form className="stack" style={{ gap: 6 }} action={setLanguage}>
            <span className="flabel">Language</span>
            <div className="seg" role="group" aria-label="Language">
              {([["en", "English"], ["zu", "isiZulu"], ["st", "Sesotho"]] as const).map(([c, l]) => (
                <button key={c} type="submit" name="language" value={c} aria-pressed={lang === c}>{l}</button>
              ))}
            </div>
          </form>
          <div className="switch">
            <span><b>High contrast</b><br /><span className="small muted">Stronger colours and underlined links</span></span>
            <button type="button" aria-pressed={prefs.contrast === "high"} aria-label="High contrast" onClick={() => update({ contrast: prefs.contrast === "high" ? "normal" : "high" })} />
          </div>
          <div className="switch">
            <span><b>Data saver</b><br /><span className="small muted">{df ? "Always on for the data-free site" : "Videos load only when you tap play, and the site uses your phone's own fonts"}</span></span>
            <button type="button" aria-pressed={prefs.saver === "on"} aria-label="Data saver" disabled={df} onClick={() => update({ saver: prefs.saver === "on" ? "off" : "on" })} />
          </div>
          <DataMeter />
          <p className="small muted">Saved on this device. <a href="/data-free">How we save your data</a></p>
        </div>
      )}
    </div>
  );
}

/** Shows roughly how much data this visit has used so far (pages, scripts, images; videos you play are extra). */
function DataMeter() {
  const [kb, setKb] = useState<number | null>(null);
  useEffect(() => {
    try {
      const entries = [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")] as PerformanceResourceTiming[];
      const bytes = entries.reduce((a, r) => a + (r.transferSize || 0), 0);
      setKb(Math.round(bytes / 1024));
    } catch {}
  }, []);
  if (kb == null || kb === 0) return null;
  return <p className="small"><b>{kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`}</b> <span className="muted">used on this page so far</span></p>;
}
