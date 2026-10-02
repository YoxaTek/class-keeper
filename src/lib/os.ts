export type Os = "ios" | "android" | "other";

/** The phone OS of the browser running this code (iPadOS reports itself as a Mac, hence the touch check). */
export function detectOs(): Os {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}
