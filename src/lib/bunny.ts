import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Bunny Stream: lesson video hosting.
 *
 * - Staff upload straight from the browser to Bunny (resumable, any size), so large
 *   files never pass through the website server. The server only signs the upload.
 * - Learners watch through Bunny's player with a signed link that expires, generated
 *   only for enrolled learners. Bunny streams at the quality the connection can handle,
 *   down to 240p if that resolution is switched on in the library.
 * - "Save for offline" downloads a small MP4 copy (MP4 fallback) through the website.
 *
 * A lesson's video is stored as "bunny:<video guid>".
 */

const API = "https://video.bunnycdn.com";

export type BunnyConfig = { libraryId: string; apiKey: string; cdnHost: string | null; tokenKey: string | null; cdnTokenKey: string | null };

export function bunnyConfig(): BunnyConfig | null {
  const libraryId = env("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = env("BUNNY_STREAM_API_KEY");
  if (!libraryId || !apiKey) return null;
  return {
    libraryId,
    apiKey,
    cdnHost: env("BUNNY_STREAM_CDN_HOST")?.replace(/^https?:\/\//, "").replace(/\/+$/, "") ?? null,
    tokenKey: env("BUNNY_STREAM_TOKEN_KEY") ?? null,
    cdnTokenKey: env("BUNNY_CDN_TOKEN_KEY") ?? null,
  };
}

export const isBunnyRef = (v: string | null | undefined): boolean => !!v && /^bunny:[0-9a-f-]{36}$/i.test(v);
export const bunnyGuid = (v: string) => v.slice(6);

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = bunnyConfig();
  if (!cfg) throw new Error("Bunny Stream is not set up (BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY).");
  const res = await fetch(`${API}/library/${cfg.libraryId}${path}`, {
    ...init,
    headers: { AccessKey: cfg.apiKey, accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Bunny Stream ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** Creates an empty video and signs a browser upload to it (valid for 12 hours). */
export async function startUpload(title: string) {
  const cfg = bunnyConfig();
  if (!cfg) throw new Error("Bunny Stream is not set up.");
  const video = await call<{ guid: string }>("/videos", { method: "POST", body: JSON.stringify({ title: title.slice(0, 200) || "Lesson video" }) });
  const expire = Math.floor(Date.now() / 1000) + 12 * 3600;
  return {
    endpoint: `${API}/tusupload`,
    libraryId: cfg.libraryId,
    videoId: video.guid,
    expire,
    signature: sha256(cfg.libraryId + cfg.apiKey + expire + video.guid),
  };
}

export type BunnyVideo = {
  guid: string;
  title: string;
  status: number; // 0 created, 1 uploaded, 2 processing, 3 transcoding, 4 finished, 5 error, 6 upload failed
  encodeProgress?: number;
  length?: number;
  availableResolutions?: string | null;
  thumbnailFileName?: string | null;
  captions?: { srclang: string; label: string }[];
};

export const STATUS_TEXT: Record<number, string> = {
  0: "Waiting for upload",
  1: "Uploaded, queued for processing",
  2: "Processing",
  3: "Converting to phone-friendly sizes",
  4: "Ready",
  5: "Processing failed: upload it again",
  6: "Upload failed: upload it again",
};

export const getVideo = (guid: string) => call<BunnyVideo>(`/videos/${guid}`);
export const deleteVideo = (guid: string) => call<unknown>(`/videos/${guid}`, { method: "DELETE" });

/** Sends a WebVTT captions file to Bunny so it shows in the player's CC menu. */
export async function addCaptions(guid: string, vtt: string, lang = "en", label = "English") {
  return call<unknown>(`/videos/${guid}/captions/${lang}`, {
    method: "POST",
    body: JSON.stringify({ srclang: lang, label, captionsFile: Buffer.from(vtt, "utf8").toString("base64") }),
  });
}

/** Player link for an enrolled learner. Signed when token authentication is on in the library. */
export function embedUrl(guid: string, hours = 6) {
  const cfg = bunnyConfig();
  if (!cfg) return null;
  const q = new URLSearchParams({ autoplay: "false", preload: "false", responsive: "true", rememberPosition: "true" });
  if (cfg.tokenKey) {
    const expires = Math.floor(Date.now() / 1000) + hours * 3600;
    q.set("token", sha256(cfg.tokenKey + guid + expires));
    q.set("expires", String(expires));
  }
  return `https://player.mediadelivery.net/embed/${cfg.libraryId}/${guid}?${q}`;
}

/** Direct CDN file link (MP4 fallback or thumbnail), signed if CDN token authentication is on. */
export function cdnUrl(path: string, minutes = 30) {
  const cfg = bunnyConfig();
  if (!cfg?.cdnHost) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!cfg.cdnTokenKey) return `https://${cfg.cdnHost}${p}`;
  const expires = Math.floor(Date.now() / 1000) + minutes * 60;
  const token = createHash("md5").update(cfg.cdnTokenKey + p + expires).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://${cfg.cdnHost}${p}?token=${token}&expires=${expires}`;
}

export const thumbnailUrl = (guid: string, file = "thumbnail.jpg") => cdnUrl(`/${guid}/${file}`, 6 * 60);

/** Lowest-data MP4 copy for offline use: 360p if available, else the smallest above it. */
export function offlineMp4Candidates(guid: string, available?: string | null) {
  const have = (available ?? "").split(",").map((r) => parseInt(r, 10)).filter(Boolean);
  const order = [360, 240, 480, 720];
  const list = have.length ? order.filter((h) => have.includes(h)) : order;
  return list.map((h) => ({ height: h, url: cdnUrl(`/${guid}/play_${h}p.mp4`, 30) })).filter((x): x is { height: number; url: string } => !!x.url);
}

type Storage = { storage: { from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null }> } } };

/**
 * Copies a lesson's WebVTT captions into the Bunny player (CC menu).
 * Captions may be an uploaded file ("storage:...") or an https link. Never throws.
 */
export async function syncCaptionsToBunny(supabase: Storage, videoRef: string | null | undefined, captionsRef: string | null | undefined): Promise<boolean> {
  if (!isBunnyRef(videoRef) || !captionsRef || !bunnyConfig()) return false;
  try {
    let vtt: string | null = null;
    if (captionsRef.startsWith("storage:")) {
      const { data } = await supabase.storage.from("lesson-files").download(captionsRef.slice(8));
      vtt = data ? await data.text() : null;
    } else if (/^https:\/\//.test(captionsRef)) {
      const r = await fetch(captionsRef, { cache: "no-store" });
      vtt = r.ok ? await r.text() : null;
    }
    if (!vtt || !vtt.trimStart().startsWith("WEBVTT")) return false;
    await addCaptions(bunnyGuid(videoRef as string), vtt);
    return true;
  } catch (e) {
    console.error("bunny captions", e);
    return false;
  }
}
