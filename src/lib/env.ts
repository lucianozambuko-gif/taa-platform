/**
 * Server-side settings read when the server runs, not when the site is built.
 *
 * Next.js copies any `process.env.NEXT_PUBLIC_...` it can see into the build, so a
 * build made for one address would keep that address forever. Reading the value by
 * name here keeps it a live setting: the same build runs on a test subdomain and later
 * on the main domain by changing one environment variable (in cPanel or Vercel).
 */
export function env(name: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === "" ? undefined : v;
}

/** Public address of the site, without a trailing slash. Set SITE_URL (or NEXT_PUBLIC_SITE_URL). */
export function siteUrl(): string {
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL"); // set automatically on Vercel
  return (env("SITE_URL") ?? env("NEXT_PUBLIC_SITE_URL") ?? (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/+$/, "");
}
