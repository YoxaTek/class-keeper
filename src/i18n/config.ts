export const locales = ["en-US", "zh-TW", "id-ID", "tl-PH", "vi-VN"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en-US";
export const LOCALE_COOKIE = "locale";

// Always shown in the language's own name, regardless of the active
// locale — a language switcher shouldn't need translating.
export const localeNativeNames: Record<Locale, string> = {
  "en-US": "English",
  "zh-TW": "繁體中文",
  "id-ID": "Bahasa Indonesia",
  "tl-PH": "Filipino",
  "vi-VN": "Tiếng Việt",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
