import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

// No locale-prefixed routes: every page lives at a single URL, and the
// active language is resolved per-request from (in priority order) the
// cookie set by the language switcher, then the signed-in user's saved
// preference, then the default. Switching language re-renders in place via
// router.refresh() — it never navigates.
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
    if (isLocale(session?.user.locale)) locale = session!.user.locale!;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
