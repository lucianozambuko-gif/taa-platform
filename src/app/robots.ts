import { siteUrl } from "@/lib/env";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/learn", "/checkout", "/orders", "/certificate", "/api"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
