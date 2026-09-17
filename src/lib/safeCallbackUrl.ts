// A callbackUrl read from a query string is untrusted input — restrict it
// to a same-origin relative path so it can't be used for an open redirect
// (e.g. "//evil.com" is protocol-relative, not actually relative).
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}
