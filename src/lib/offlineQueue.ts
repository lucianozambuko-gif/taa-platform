"use client";
/** Progress and quiz answers recorded with no signal, kept on the phone until they can be sent. */
import type { OfflineItem } from "@/app/learn/actions";

const KEY = "taa-offline-queue";
export const QUEUE_EVENT = "taa-offline-queue";

export function readQueue(): OfflineItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function writeQueue(items: OfflineItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event(QUEUE_EVENT));
}
export function enqueue(item: OfflineItem) {
  // One entry per lesson: a newer attempt replaces an older one still waiting.
  writeQueue([...readQueue().filter((i) => !(i.lesson === item.lesson && i.kind === item.kind)), item]);
}
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
