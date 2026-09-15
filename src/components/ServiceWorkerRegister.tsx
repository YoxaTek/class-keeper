"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // In dev, /_next/static/ chunks aren't actually immutable between edits
    // the way the service worker assumes for production — registering it
    // here would cache-first serve stale JS after every change. Unregister
    // any worker a previous production build left behind, instead.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline caching is a progressive enhancement — ignore failures.
      });
    }
  }, []);

  return null;
}
