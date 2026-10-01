"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { THEMES, applyTheme, type Theme } from "@/lib/theme";
import s from "./ThemeSwitcher.module.scss";

const ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

// Applies the theme immediately (no reload) and remembers it in a cookie so
// the server renders the right <html data-theme> on the next request —
// "system" just clears both and lets the device decide.
export function ThemeSwitcher({ initial, compact = false }: { initial: Theme; compact?: boolean }) {
  const t = useTranslations("account");
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div role="radiogroup" aria-label={t("theme")} className={s.group}>
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={theme === option}
            onClick={() => choose(option)}
            aria-label={t(`theme_${option}`)}
            title={t(`theme_${option}`)}
            className={`${s.option} ${theme === option ? s.active : ""}`}
          >
            <Icon size={14} aria-hidden />
            {!compact && t(`theme_${option}`)}
          </button>
        );
      })}
    </div>
  );
}
