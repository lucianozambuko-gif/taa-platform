import { redirectOrNotFound } from "@/lib/redirects";

export const dynamic = "force-dynamic";

/** Any URL the new site doesn't have: follow a staff-added redirect (old website links), otherwise 404. */
export default async function LegacyRedirect({ params }: { params: Promise<{ legacy: string[] }> }) {
  const { legacy } = await params;
  return redirectOrNotFound("/" + legacy.map((p) => decodeURIComponent(p)).join("/"));
}
