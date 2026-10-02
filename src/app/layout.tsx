import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_TC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallProvider } from "@/components/InstallProvider";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { GoogleAdSense } from "@/components/GoogleAdSense";
import { THEME_COOKIE, isTheme, themeAttribute } from "@/lib/theme";
import "./globals.scss";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ClassKeeper",
  description: "Attendance, grading, and roster management for a Chinese language class.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClassKeeper",
  },
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();
  // Read server-side so the very first paint already has the chosen theme.
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeAttribute(themeCookie) : undefined;

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${jakarta.variable} ${notoSansTC.variable}`}
    >
      <body
        style={{ fontFamily: "var(--font-jakarta), var(--font-noto-sans-tc), -apple-system, sans-serif" }}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthSessionProvider>
            <InstallProvider>{children}</InstallProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
        <GoogleAdSense />
      </body>
    </html>
  );
}
