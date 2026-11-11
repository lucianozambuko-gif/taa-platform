"use client";

import { useEffect, useState } from "react";
import { syncOffline } from "@/app/learn/actions";
import { QUEUE_EVENT, readQueue, writeQueue } from "@/lib/offlineQueue";

/** Shows when the phone is offline, and sends progress saved offline as soon as signal returns. */
export default function OfflineSync() {
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let busy = false;
    const count = () => setWaiting(readQueue().length);
    const sync = async () => {
      const items = readQueue();
      if (busy || !items.length || !navigator.onLine) return;
      busy = true;
      try {
        const res = await syncOffline(items);
        // Keep anything added while we were sending.
        const sent = new Set(items.map((i) => `${i.kind}:${i.lesson}:${i.at}`));
        writeQueue(readQueue().filter((i) => !sent.has(`${i.kind}:${i.lesson}:${i.at}`)));
        if (res.synced) setNote([`Back online: ${res.synced} saved ${res.synced === 1 ? "item" : "items"} sent to the Academy.`, ...res.results].join(" "));
      } catch {
        /* still no real connection; try again on the next "online" event */
      } finally {
        busy = false;
        count();
      }
    };
    const update = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) sync();
    };
    update();
    count();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener(QUEUE_EVENT, count);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener(QUEUE_EVENT, count);
    };
  }, []);

  if (offline)
    return (
      <div className="offline-bar" role="status">
        <b>You’re offline.</b> Lessons saved on this phone still open.
        {waiting > 0 ? ` ${waiting} ${waiting === 1 ? "item" : "items"} will be sent when you’re back online.` : " Your progress is saved and sent when you’re back online."}
      </div>
    );
  if (note)
    return (
      <div className="offline-bar ok" role="status">
        {note} <button className="linkish" onClick={() => setNote(null)}>Close</button>
      </div>
    );
  return null;
}
