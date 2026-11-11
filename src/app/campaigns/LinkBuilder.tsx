"use client";

import { useEffect, useState } from "react";
import CopyLink from "@/components/CopyLink";

const SOURCES = ["facebook", "instagram", "google", "linkedin", "whatsapp", "email", "sms", "flyer"];

/** Builds a campaign landing-page link for one course; every enquiry from it is tagged with the source. */
export default function LinkBuilder({ courses }: { courses: { slug: string; title: string }[] }) {
  const [slug, setSlug] = useState(courses[0]?.slug ?? "");
  const [source, setSource] = useState("facebook");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const tag = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const path = `/campaigns/${slug}?utm_source=${source}${tag ? `&utm_campaign=${tag}` : ""}`;
  const url = origin + path;
  if (!courses.length) return <p className="small muted">Publish a course first; then it gets a campaign page automatically.</p>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="grid g3" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="cb-course">Course</label>
          <select id="cb-course" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {courses.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cb-source">Where the advert runs</label>
          <select id="cb-source" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cb-name">Campaign name (optional)</label>
          <input id="cb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="January intake" maxLength={40} />
        </div>
      </div>
      <div className="copy-row">
        <code title={url}>{url}</code>
        <CopyLink url={url} />
        <a className="btn btn-ghost btn-sm" href={path} target="_blank" rel="noopener">Preview</a>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Enquiries from this link arrive in the lead register tagged “campaign:{source}{tag ? `:${tag}` : ""}”.</p>
    </div>
  );
}
