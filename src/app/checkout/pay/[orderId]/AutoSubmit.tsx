"use client";

import { useEffect } from "react";

export default function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    window.gtag?.("event", "begin_checkout");
    const t = setTimeout(() => (document.getElementById(formId) as HTMLFormElement | null)?.submit(), 900);
    return () => clearTimeout(t);
  }, [formId]);
  return null;
}
