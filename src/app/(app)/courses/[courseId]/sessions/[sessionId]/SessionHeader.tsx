"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import s from "./session.module.scss";

// A print trigger with no dependency on the print-only table living inside
// ClassDetailTable elsewhere on the page — window.print() just prints
// whatever the page's print stylesheet currently marks visible, regardless
// of which component's button called it.
export function SessionHeader({ backHref, title, subtitle }: { backHref: string; title: string; subtitle: string }) {
  const t = useTranslations();

  return (
    <div className={s.header}>
      <div className={s.left}>
        <Link href={backHref} aria-label={t("common.back")} className={s.back}>
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <div className={s.titles}>
          <h2 className={s.title}>{title}</h2>
          <p className={`tabular ${s.subtitle}`}>{subtitle}</p>
        </div>
      </div>
      <button type="button" onClick={() => window.print()} aria-label={t("sessions.exportPdf")} className={s.pdf}>
        <Download size={16} aria-hidden />
        PDF
      </button>
    </div>
  );
}
