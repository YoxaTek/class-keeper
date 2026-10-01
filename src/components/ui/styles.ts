// Class names for the app's shared primitives — the styles themselves live
// in ui.module.scss (tokens in src/styles/tokens.scss). Still exported as
// plain strings so existing `className={`${inputClass} ...`}` call sites
// keep working unchanged.
import s from "./ui.module.scss";

export const inputClass = s.input;
export const inputClassSm = `${s.input} ${s.sm}`;
export const labelClass = s.label;
export const cardClass = s.card;
export const linkClass = s.link;
export const cardHoverClass = s.cardHover;
export const iconButtonClass = s.iconButton;
export const iconDangerClass = `${s.iconButton} ${s.danger}`;

const SIZES = { sm: s.sizeSm, md: s.sizeMd, lg: s.sizeLg };

export function buttonClass(
  variant: "primary" | "secondary" | "danger" | "ghost" | "accent" = "secondary",
  size: "sm" | "md" | "lg" = "md",
  rounded: "md" | "full" = "md"
) {
  return [s.button, SIZES[size], s[variant], rounded === "full" && s.full].filter(Boolean).join(" ");
}
