import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackedLink from "@/components/TrackedLink";
import Analytics from "@/components/Analytics";
import BottomNav from "@/components/BottomNav";
import { ServiceWorker } from "@/components/AppInstall";
import OfflineSync from "@/components/OfflineSync";
import { FONTS_URL, displayBootScript } from "@/components/DisplaySettings";
import DataFreeBar from "@/components/DataFreeBar";
import AdvisorChat from "@/components/AdvisorChat";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/format";
import { getSiteContent } from "@/lib/siteContent";
import { LANGS, getT } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Training Africa Academy", template: "%s | Training Africa Academy" },
  description: "Skills courses, accredited programmes and learnerships in Johannesburg and online.",
  appleWebApp: { capable: true, title: "TA Academy", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taa-platform-six.vercel.app"),
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0F1A2E" }, { media: "(prefers-color-scheme: light)", color: "#141416" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  let signedIn = false;
  let role = "learner";
  try {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    signedIn = !!user;
    if (user) role = (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role ?? "learner";
  } catch {}
  const [{ announcement }, { lang, t }] = await Promise.all([getSiteContent(), getT()]);
  return (
    <html lang={LANGS.find((l) => l.code === lang)?.html ?? "en-ZA"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: displayBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <noscript><link rel="stylesheet" href={FONTS_URL} /></noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <DataFreeBar />
        <Analytics gaId={ga} />
        <ServiceWorker />
        <OfflineSync />
        {announcement.on && announcement.text && (
          <div className="announce" role="region" aria-label="Announcement">
            {announcement.link ? <a href={announcement.link}>{announcement.text} →</a> : <span>{announcement.text}</span>}
          </div>
        )}
        {lang !== "en" && <div className="lang-draft">{t("draft")}</div>}
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {signedIn && <Suspense fallback={null}><BottomNav role={role} labels={{ home: t("nav.home"), courses: t("nav.courses"), learning: t("nav.mylearning"), help: t("nav.help") }} /></Suspense>}
        <AdvisorChat />
      </body>
    </html>
  );
}
