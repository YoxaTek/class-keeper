import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Profile pictures served back to us by each OAuth provider.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "profile.line-scdn.net" },
      // QR code for a course's public join link (see JoinLinkCard) — rendered
      // via this free image API instead of a client-side QR library.
      { protocol: "https", hostname: "api.qrserver.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
