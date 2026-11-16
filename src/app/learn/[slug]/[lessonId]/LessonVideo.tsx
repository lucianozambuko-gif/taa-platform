"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  captions: string | null;
  title: string;
  poster: React.ReactNode;
  minutes?: number;
  /** Set when the video can be kept on the phone (Bunny Stream or an uploaded file). */
  lessonId?: string;
  offline?: boolean;
};

const embedOf = (src: string) => {
  if (/^https:\/\/(player|iframe)\.mediadelivery\.net\/embed\//.test(src)) return src; // Bunny Stream, already signed
  const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&cc_load_policy=1` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
};
const withAutoplay = (url: string) =>
  url.includes("autoplay=false") ? url.replace("autoplay=false", "autoplay=true") : url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");

/**
 * Lesson video. Bunny Stream plays at the quality the connection can handle.
 * In data-saver mode nothing downloads until the learner taps play.
 * "Save video to this phone" keeps a small copy for watching with no signal.
 */
export default function LessonVideo({ src, captions, title, poster, minutes = 0, lessonId, offline = false }: Props) {
  const [saver, setSaver] = useState(false);
  const [df, setDf] = useState(false);
  const [load, setLoad] = useState(false);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState<{ saved: boolean; bytes: number } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const key = lessonId ? `/offline-video/${lessonId}` : "";

  useEffect(() => {
    const read = () => { setSaver(document.documentElement.dataset.saver === "on"); setDf(document.documentElement.dataset.datafree === "on"); };
    const net = () => setOnline(navigator.onLine);
    read();
    net();
    window.addEventListener("taa-display-change", read);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener("taa-display-change", read);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);

  useEffect(() => {
    if (!offline || !key || !("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.key !== key) return;
      if (d.type === "video-status") { setSaved({ saved: d.saved, bytes: d.bytes }); setProgress(null); }
      if (d.type === "video-progress") setProgress(`Saving… ${Math.round(d.got / 1048576)} MB${d.total ? ` of ${Math.round(d.total / 1048576)} MB` : ""}`);
      if (d.type === "video-error") setProgress(d.message);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: "video-status", key }));
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [offline, key]);

  const post = (msg: Record<string, unknown>) => navigator.serviceWorker?.ready.then((r) => r.active?.postMessage({ ...msg, key }));
  const estimate = minutes > 0 ? ` (about ${Math.max(3, Math.round(minutes * 2.5))} MB)` : "";

  const saveBar = offline && key && saved && (
    <div className="save-course" style={{ marginTop: 8 }}>
      {progress ? (
        <p className="small"><b>{progress}</b></p>
      ) : saved.saved ? (
        <p className="small">
          <b>✓ Saved on this phone</b> ({Math.max(1, Math.round(saved.bytes / 1048576))} MB).{" "}
          {!useSaved && online && <button className="linkish small" onClick={() => setUseSaved(true)}>Play the saved copy</button>}{" "}
          <button className="linkish small" onClick={() => post({ type: "remove-video" })}>Remove</button>
        </p>
      ) : online ? (
        <p className="small muted">
          Watching later with no signal?{" "}
          <button className="btn btn-ghost btn-sm" onClick={() => { setProgress("Starting download…"); post({ type: "save-video", url: `/api/video/offline/${lessonId}` }); }}>
            Save video to this phone{estimate}
          </button>
        </p>
      ) : null}
    </div>
  );

  // Offline (or chosen): play the copy kept on the phone.
  if (offline && saved?.saved && (!online || useSaved))
    return (
      <div>
        <video className="player" controls preload="metadata" src={key} style={{ width: "100%" }}>
          {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
        </video>
        {saveBar}
      </div>
    );

  if (!online)
    return (
      <div className="player">
        {poster}
        <div className="cap">You're offline. {offline ? "Save this video to your phone next time you have Wi-Fi to watch it with no signal." : "The video plays when you're back online."}</div>
      </div>
    );

  const embed = embedOf(src);
  if (saver && !load)
    return (
      <div>
        <div className="player">
          {poster}
          <button className="play" onClick={() => setLoad(true)} aria-label={`Load and play ${title}`}>
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8z" fill="#DB0B0B" /></svg>
          </button>
          <div className="cap">
            {df ? "This video isn't data-free: it uses your mobile data." : "Data saver is on: the video loads when you tap play."}
            {minutes > 0 && <> About {Math.max(5, Math.round(minutes * 4))} MB for {minutes} minutes at low quality.</>}
          </div>
        </div>
        {saveBar}
      </div>
    );
  if (embed)
    return (
      <div>
        <div className="player" style={{ aspectRatio: "16 / 9", padding: 0 }}>
          <iframe src={saver && load ? withAutoplay(embed) : embed} title={title} loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />
        </div>
        {saveBar}
      </div>
    );
  return (
    <div>
      <video className="player" controls preload={saver ? "auto" : "metadata"} autoPlay={saver && load} src={src} style={{ width: "100%" }}>
        {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
      </video>
      {saveBar}
    </div>
  );
}
