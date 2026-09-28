"use client";

import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { useTranslations } from "next-intl";

// A print trigger with no dependency on the print-only table living inside
// ClassDetailTable elsewhere on the page — window.print() just prints
// whatever the page's print stylesheet currently marks visible, regardless
// of which component's button called it.
export function SessionHeader({ backHref, title, subtitle }: { backHref: string; title: string; subtitle: string }) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between gap-3 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={backHref}
          aria-label={t("common.back")}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="tabular truncate text-[11px] text-zinc-500 dark:text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        aria-label={t("sessions.exportPdf")}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Download className="h-4 w-4" aria-hidden />
        PDF
      </button>
    </div>
  );
}
