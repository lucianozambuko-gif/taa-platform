import type { Metadata, Viewport } from "next";
import Script from "next/script";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackedLink from "@/components/TrackedLink";
import { whatsappLink } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Training Africa Academy", template: "%s | Training Africa Academy" },
  description: "Skills courses, accredited programmes and learnerships in Johannesburg and online.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en-ZA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        {ga && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');`}
            </Script>
          </>
        )}
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
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
