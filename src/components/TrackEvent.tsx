"use client";

import { useEffect } from "react";

/** Sends one GA4 event when it mounts (e.g. purchase on the payment success page). */
export default function TrackEvent({ name, params }: { name: string; params?: Record<string, string | number> }) {
  useEffect(() => {
    window.gtag?.("event", name, params ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
