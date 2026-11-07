"use client";

import { useEffect, useRef, useState } from "react";

type Prefs = { text: "md" | "lg" | "xl"; contrast: "normal" | "high"; saver: "on" | "off" };
const KEY = "taa-display";
const DEFAULTS: Prefs = { text: "md", contrast: "normal", saver: "off" };

function apply(p: Prefs) {
  const el = document.documentElement;
  el.dataset.text = p.text;
  el.dataset.contrast = p.contrast;
  el.dataset.saver = p.saver;
}

/** Runs before first paint (in <head>) so saved settings don't flash. Turns data saver on when the phone asks for it. */
export const displayBootScript = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'null');var c=navigator.connection;if(!p){p={text:'md',contrast:'normal',saver:(c&&c.saveData)?'on':'off'}}var e=document.documentElement;e.dataset.text=p.text;e.dataset.contrast=p.contrast;e.dataset.saver=p.saver}catch(x){}`;

/** Text size, high contrast and data saver (RFQ section 6: scalable text, lower-bandwidth learners). */
export default function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.documentElement;
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
          <div className="switch">
            <span><b>High contrast</b><br /><span className="small muted">Stronger colours and underlined links</span></span>
            <button type="button" aria-pressed={prefs.contrast === "high"} aria-label="High contrast" onClick={() => update({ contrast: prefs.contrast === "high" ? "normal" : "high" })} />
          </div>
          <div className="switch">
            <span><b>Data saver</b><br /><span className="small muted">Videos only load when you tap play</span></span>
            <button type="button" aria-pressed={prefs.saver === "on"} aria-label="Data saver" onClick={() => update({ saver: prefs.saver === "on" ? "off" : "on" })} />
          </div>
          <p className="small muted">Saved on this device.</p>
        </div>
      )}
    </div>
  );
}
