"use client";

import { useEffect, useState } from "react";

/** In data-saver mode the video doesn't download anything until the learner taps play. */
export default function LessonVideo({ src, captions, title, poster }: { src: string; captions: string | null; title: string; poster: React.ReactNode }) {
  const [saver, setSaver] = useState(false);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    const read = () => setSaver(document.documentElement.dataset.saver === "on");
    read();
    window.addEventListener("taa-display-change", read);
    return () => window.removeEventListener("taa-display-change", read);
  }, []);
  if (saver && !load)
    return (
      <div className="player">
        {poster}
        <button className="play" onClick={() => setLoad(true)} aria-label={`Load and play ${title}`}>
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8z" fill="#0E6B5A" /></svg>
        </button>
        <div className="cap">Data saver is on: the video loads when you tap play.</div>
      </div>
    );
  return (
    <video className="player" controls preload={saver ? "auto" : "metadata"} autoPlay={saver && load} src={src} style={{ width: "100%" }}>
      {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
    </video>
  );
}
