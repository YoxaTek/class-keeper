"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import type { Session } from "@prisma/client";
import {
  ClassAttendancePdfTable,
  type PdfAssessment,
  type PdfAttendance,
  type PdfEnrollment,
  type PdfFeedback,
  type PdfScore,
} from "@/components/ClassAttendancePdfTable";
import { iconButtonClass } from "@/components/ui/styles";
import s from "./ExportSessionPdfButton.module.scss";

/**
 * Exports one class's roster/attendance sheet straight from the class list —
 * no navigation to the class detail page at all. Printing only the table
 * (not the whole list page underneath it) takes more than hiding the table
 * itself off-screen: the table is portaled to a direct child of <body> and
 * every one of body's OTHER direct children gets hidden for the duration
 * (see the `print-portal-active` rule in globals.css) — otherwise the
 * printed page would still include the breadcrumb, filters, and every
 * other class card along with it.
 */
export function ExportSessionPdfButton({
  title,
  session,
  assessments,
  enrollments,
  attendance,
  scores,
  sessionFeedback,
}: {
  title: string;
  session: Pick<Session, "hasMidterm" | "midtermMaxScore" | "hasFinal" | "finalMaxScore" | "hasFeedback">;
  assessments: PdfAssessment[];
  enrollments: PdfEnrollment[];
  attendance: PdfAttendance[];
  scores: PdfScore[];
  sessionFeedback: PdfFeedback[];
}) {
  const t = useTranslations("sessions");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("print-portal-active");
    // `afterprint` (not a fixed delay) is what actually tells us the dialog
    // closed — window.print() blocks on desktop but returns immediately on
    // iOS Safari, so unmounting the table right after calling it would risk
    // pulling it out from under the print preview there.
    const onAfterPrint = () => setPrinting(false);
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
    return () => {
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("print-portal-active");
    };
  }, [printing]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPrinting(true)}
        title={t("exportPdf")}
        className={`${iconButtonClass} ${s.trigger}`}
      >
        <Printer size={14} aria-hidden />
        {/* "PDF" isn't translated — it's a file-format name, not a phrase,
            same in every locale this app ships. */}
        PDF
      </button>
      {printing &&
        createPortal(
          <div className={`print-portal ${s.portal}`}>
            <ClassAttendancePdfTable
              title={title}
              session={session}
              assessments={assessments}
              enrollments={enrollments}
              attendance={attendance}
              scores={scores}
              sessionFeedback={sessionFeedback}
            />
          </div>,
          document.body
        )}
    </>
  );
}
