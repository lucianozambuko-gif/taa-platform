/** Photos from the Academy's library. Gallery uploads have a small "-sm" copy for cards and phones.
 *  In data saver mode, photos are hidden by CSS (html[data-saver="on"] .photo) and not downloaded,
 *  because hidden lazy images are never fetched. */
export function photoSrc(url: string) {
  const small = /\/site-media\/gallery\/[^/]+\.webp$/.test(url) ? url.replace(/\.webp$/, "-sm.webp") : null;
  return { src: small ?? url, srcSet: small ? `${small} 640w, ${url} 1280w` : undefined };
}

export default function Photo({ url, alt, className = "", sizes = "(max-width: 860px) 100vw, 400px", eager = false }: { url: string; alt: string; className?: string; sizes?: string; eager?: boolean }) {
  const { src, srcSet } = photoSrc(url);
  return (
    <div className={`photo ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />
    </div>
  );
}
