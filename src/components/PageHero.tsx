import { gallery } from "@/lib/gallery";

/** Photo banner at the top of public pages: one of the Academy's own training photos behind a dark-to-red wash. */
export default function PageHero({ eyebrow, title, photo, children }: { eyebrow: string; title: React.ReactNode; photo: string; children?: React.ReactNode }) {
  return (
    <section className="page-hero" style={{ ["--hero" as string]: `url(${gallery(photo)})` }}>
      <div className="wrap">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <div className="page-hero-lead">{children}</div>}
      </div>
    </section>
  );
}
