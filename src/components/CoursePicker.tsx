"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Option = { slug: string; title: string; count?: number };

/**
 * "Course: [choose]" picker for teaching pages: pick the course to work on instead of
 * scrolling a long row of tabs. Keeps working without JavaScript (the Go button).
 */
export default function CoursePicker({ basePath, courses, active }: { basePath: string; courses: Option[]; active?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form action={basePath} className="course-picker" aria-busy={pending}>
      <label htmlFor="course-pick">Course</label>
      <select
        id="course-pick"
        name="course"
        defaultValue={active}
        onChange={(e) => start(() => router.push(`${basePath}?course=${encodeURIComponent(e.target.value)}`))}
      >
        {courses.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.title}{c.count != null ? ` (${c.count} ${c.count === 1 ? "learner" : "learners"})` : ""}
          </option>
        ))}
      </select>
      <noscript><button className="btn btn-ghost btn-sm">Go</button></noscript>
      <span className="small muted">{pending ? "Loading…" : `${courses.length} ${courses.length === 1 ? "course" : "courses"}`}</span>
    </form>
  );
}
