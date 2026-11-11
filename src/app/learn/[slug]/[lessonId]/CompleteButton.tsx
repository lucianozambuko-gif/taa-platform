"use client";

import { useState } from "react";
import { completeLesson } from "../../actions";
import { enqueue, isOffline } from "@/lib/offlineQueue";

/** "Mark as complete": works offline too, by keeping the tick on the phone until signal returns. */
export default function CompleteButton({ lesson, slug, next, isDone }: { lesson: string; slug: string; next: string; isDone: boolean }) {
  const [savedOffline, setSavedOffline] = useState(false);
  return (
    <form
      action={completeLesson}
      onSubmit={(e) => {
        if (!isOffline()) return;
        e.preventDefault();
        enqueue({ kind: "lesson", lesson, slug, at: new Date().toISOString() });
        setSavedOffline(true);
        if (next) setTimeout(() => (location.href = `/learn/${slug}/${next}`), 900);
      }}
    >
      <input type="hidden" name="lesson" value={lesson} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="next" value={next} />
      <button className={`btn ${isDone || savedOffline ? "btn-ghost" : "btn-primary"}`}>
        {savedOffline ? "✓ Saved on this phone" : isDone ? "Completed ✓ — continue" : "Mark as complete"}
      </button>
    </form>
  );
}
