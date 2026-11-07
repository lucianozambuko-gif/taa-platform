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
        onClick?.(e);
      }}
    />
  );
}
