// Shared class strings for the app's restrained palette (zinc neutral,
// one accent, red danger — nothing else). Centralized so every form field
// and button reads the same way instead of drifting per-screen.
//
// The accent is the app icon's exact color (#0f6e56), not a stock Tailwind
// shade, so buttons/focus rings/links actually match the app's own mark.
export const ACCENT = "#0f6e56";
export const ACCENT_HOVER = "#0c5d49";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 focus:border-[#0f6e56] focus:outline-none focus:ring-1 focus:ring-[#0f6e56] " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export const inputClassSm = inputClass.replace("px-2.5 py-1.5 text-sm", "px-2 py-1 text-xs");

export const labelClass = "block text-xs font-medium text-zinc-600 dark:text-zinc-400";

export const cardClass =
  "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export const linkClass = "text-[#0f6e56] hover:underline dark:text-teal-400";

export function buttonClass(
  variant: "primary" | "secondary" | "danger" | "ghost" = "secondary",
  size: "sm" | "md" = "md"
) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";
  const variants = {
    primary: "bg-[#0f6e56] text-white hover:bg-[#0c5d49]",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
    danger: "border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950",
    ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
  };
  return `${base} ${sizes} ${variants[variant]}`;
}
