import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { defaultLocale, isLocale, locales, LOCALE_COOKIE } from "./config";

// Picks the first Accept-Language entry (sent by the browser/OS, highest
// weight first) that matches a supported locale, either exactly or by
// language prefix (e.g. "zh" → "zh-TW").
function localeFromAcceptLanguage(header: string | null): string | undefined {
  if (!header) return undefined;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean);
  for (const tag of tags) {
    const exact = locales.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const lang = tag.split("-")[0].toLowerCase();
    const byLanguage = locales.find((l) => l.split("-")[0].toLowerCase() === lang);
    if (byLanguage) return byLanguage;
  }
  return undefined;
}

// No locale-prefixed routes: every page lives at a single URL, and the
// active language is resolved per-request from (in priority order) the
// cookie set by the language switcher, then the signed-in user's saved
// preference, then the browser/OS language, then the default. Switching
// language re-renders in place via router.refresh() — it never navigates.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  // The cookie reflects the most recent choice made via the language
  // switcher (set immediately, no re-login needed). The session's saved
  // locale is only a fallback for a fresh browser/device that hasn't set
  // the cookie yet.
  let locale = defaultLocale as string;
  if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const session = await auth();
    if (isLocale(session?.user.locale)) {
      locale = session!.user.locale!;
    } else {
      const headerStore = await headers();
      const detected = localeFromAcceptLanguage(headerStore.get("accept-language"));
      if (isLocale(detected)) locale = detected;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
