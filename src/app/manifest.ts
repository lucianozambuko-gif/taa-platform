import type { MetadataRoute } from "next";

/** Lets learners install the site on their phone's home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training Africa Academy",
    short_name: "TA Academy",
    description: "Skills courses, accredited programmes and learnerships. Learn on your phone.",
    start_url: "/dashboard?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F5F2",
    theme_color: "#0E6B5A",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My learning", url: "/dashboard" },
      { name: "Find a course", url: "/courses" },
    ],
  };
}
