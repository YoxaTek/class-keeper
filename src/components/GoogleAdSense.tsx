import Script from "next/script";

/**
 * Loads the AdSense script site-wide. Renders nothing until
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID is set — safe to leave in place while the
 * AdSense account is still being set up.
 */
export function GoogleAdSense() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
