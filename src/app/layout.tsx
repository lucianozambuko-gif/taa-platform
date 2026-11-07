import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackedLink from "@/components/TrackedLink";
import Analytics from "@/components/Analytics";
import BottomNav from "@/components/BottomNav";
import { displayBootScript } from "@/components/DisplaySettings";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/format";
import { getSiteContent } from "@/lib/siteContent";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Training Africa Academy", template: "%s | Training Africa Academy" },
  description: "Skills courses, accredited programmes and learnerships in Johannesburg and online.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
  const { announcement } = await getSiteContent();
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: displayBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <Analytics gaId={ga} />
        {announcement.on && announcement.text && (
          <div className="announce">
            {announcement.link ? <a href={announcement.link}>{announcement.text} →</a> : <span>{announcement.text}</span>}
          </div>
        )}
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        {signedIn && <Suspense fallback={null}><BottomNav role={role} /></Suspense>}
        <TrackedLink
          className="wa-float"
          href={whatsappLink("Hi Training Africa Academy, I'd like help choosing a course.")}
          target="_blank"
          rel="noopener"
          event="whatsapp_click"
          params={{ page: "float" }}
        >
          WhatsApp us
        </TrackedLink>
      </body>
    </html>
  );
}
