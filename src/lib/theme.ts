// The theme choice. "system" is represented by having no cookie / no
// data-theme attribute at all, so the device setting decides. The palettes
// themselves live in styles/tokens.scss.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** The value for <html data-theme>, or undefined to follow the device. */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Browser only: applies the theme to <html> right away and remembers it in the cookie the server reads. */
export function applyTheme(theme: Theme): void {
  const attribute = themeAttribute(theme);
  const root = document.documentElement;
  if (attribute) {
    root.setAttribute("data-theme", attribute);
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } else {
    root.removeAttribute("data-theme");
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}
