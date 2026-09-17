"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Renders nothing until both NEXT_PUBLIC_ADSENSE_CLIENT_ID and _SLOT_ID are set. */
export function AdSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

  useEffect(() => {
    if (!clientId || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle script may not have loaded yet (blocked, slow network) — safe to skip.
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
