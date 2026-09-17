"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/lib/actions/setLocale";
import { localeNativeNames } from "@/i18n/config";

const OTHER: Record<"en-US" | "zh-TW", { locale: "en-US" | "zh-TW"; label: string }> = {
  "en-US": { locale: "zh-TW", label: "中" },
  "zh-TW": { locale: "en-US", label: "EN" },
};

// Single button showing the language you'd switch TO, not the current one.
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const target = OTHER[locale === "zh-TW" ? "zh-TW" : "en-US"];

  function onClick() {
    if (isPending) return;
    startTransition(async () => {
      await setLocale(target.locale);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={localeNativeNames[target.locale]}
      className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {target.label}
    </button>
  );
}
