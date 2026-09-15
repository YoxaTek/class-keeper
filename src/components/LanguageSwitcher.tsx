"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/setLocale";
import { locales, localeNativeNames } from "@/i18n/config";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
      <Globe className="h-4 w-4" aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="text-zinc-900">
            {localeNativeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
