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
  const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const embed = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&cc_load_policy=1` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
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
  if (embed)
    return (
      <div className="player" style={{ aspectRatio: "16 / 9", padding: 0 }}>
        <iframe src={embed + (saver && load ? (embed.includes("?") ? "&autoplay=1" : "?autoplay=1") : "")} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />
      </div>
    );
  return (
    <video className="player" controls preload={saver ? "auto" : "metadata"} autoPlay={saver && load} src={src} style={{ width: "100%" }}>
      {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
    </video>
  );
}
