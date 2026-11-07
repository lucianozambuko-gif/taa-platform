"use client";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  params?: Record<string, string | number>;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** A link that sends a GA4 event when clicked (WhatsApp clicks, brochure downloads). */
export default function TrackedLink({ event, params, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        window.gtag?.("event", event, params ?? {});
        if (event === "brochure_download" || event === "whatsapp_click") {
          const label = String(params?.item ?? params?.page ?? "");
          try {
            navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ kind: event, label, path: location.pathname })], { type: "application/json" }));
          } catch {}
        }
        onClick?.(e);
      }}
    />
  );
}
