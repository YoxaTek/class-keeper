"use client";

import { useTranslations } from "next-intl";
import type { AttendanceStatus, ScoreCategory, Session } from "@prisma/client";

export type PdfEnrollment = {
  id: string;
  student: { name: string; chineseName: string | null; studentId: string | null };
};
export type PdfAttendance = { enrollmentId: string; status: AttendanceStatus; note: string | null };
export type PdfScore = {
  enrollmentId: string;
  category: ScoreCategory;
  originalScore: number | null;
  retakeScore: number | null;
  retakeMaxScore: number | null;
};
export type PdfFeedback = { enrollmentId: string; note: string };

/**
 * The class roster + attendance export — shared by the class detail page's
 * own Export button and the class list's per-row export, so both produce
 * the exact same sheet from the exact same rules. Renders only a `<table>`
 * (plus a scoped landscape @page rule); the caller decides how/when it's
 * shown (print-only vs. print-and-preview).
 */
export function ClassAttendancePdfTable({
  title,
  session,
  enrollments,
  attendance,
  scores,
  sessionFeedback,
}: {
  /** e.g. "114-2 生活華語進階班學生紀錄簿（Week12-115.05.26）" — see buildClassRecordTitle. */
  title: string;
  session: Pick<
    Session,
    | "hasQuiz"
    | "quizMaxScore"
    | "hasAssignment"
    | "assignmentMaxScore"
    | "hasMidterm"
    | "midtermMaxScore"
    | "hasFinal"
    | "finalMaxScore"
    | "hasFeedback"
  >;
  enrollments: PdfEnrollment[];
  attendance: PdfAttendance[];
  scores: PdfScore[];
  sessionFeedback: PdfFeedback[];
}) {
  const t = useTranslations();

  const attendanceByEnrollment = new Map(attendance.map((a) => [a.enrollmentId, a]));
  const scoresByEnrollment = new Map<string, Map<ScoreCategory, PdfScore>>();
  for (const s of scores) {
    if (!scoresByEnrollment.has(s.enrollmentId)) scoresByEnrollment.set(s.enrollmentId, new Map());
    scoresByEnrollment.get(s.enrollmentId)!.set(s.category, s);
  }
  const feedbackByEnrollment = new Map(sessionFeedback.map((f) => [f.enrollmentId, f.note]));

  // Whichever score categories this session actually has configured — same
  // effective-score convention (retake wins if entered) used on the
  // student's own grade view, always shown against the session's own
  // total rather than a retake's possibly-different one. A blank score
  // shows a category-appropriate placeholder instead of a bare "—/max".
  const scoreColumns: { header: string; get: (enrollmentId: string) => string }[] = [];
  const scoreCell = (category: ScoreCategory, enrollmentId: string, max: number, emptyLabel: string) => {
    const s = scoresByEnrollment.get(enrollmentId)?.get(category);
    const raw = s?.retakeScore ?? s?.originalScore ?? null;
    return raw !== null ? `${raw} / ${max}` : emptyLabel;
  };
  if (session.hasQuiz) {
    scoreColumns.push({
      header: "小考成績",
      get: (id) => scoreCell("QUIZ", id, session.quizMaxScore, "未小考"),
    });
  }
  if (session.hasAssignment) {
    scoreColumns.push({
      header: t("sessions.assignment"),
      get: (id) => scoreCell("ASSIGNMENT", id, session.assignmentMaxScore, "—"),
    });
  }
  if (session.hasMidterm) {
    scoreColumns.push(
      { header: "閱讀", get: (id) => scoreCell("MIDTERM_READING", id, session.midtermMaxScore / 2, "—") },
      { header: "聽力", get: (id) => scoreCell("MIDTERM_LISTENING", id, session.midtermMaxScore / 2, "—") }
    );
  }
  if (session.hasFinal) {
    scoreColumns.push({
      header: t("sessions.final"),
      get: (id) => scoreCell("FINAL", id, session.finalMaxScore, "—"),
    });
  }

  return (
    <>
      {/* Scoped here rather than in globals.css — this table is wide, but
          that's no reason to force landscape on some unrelated print
          feature elsewhere in the app. */}
      <style>{"@page { size: landscape; }"}</style>
      <p className="mb-2 text-lg font-bold">{title}</p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black text-center">
            <th className="px-2 py-1">#</th>
            <th className="px-2 py-1">{t("join.studentId")}</th>
            <th className="px-2 py-1">{t("common.name")}</th>
            <th className="px-2 py-1">{t("common.chineseName")}</th>
            <th className="px-2 py-1">出席狀況</th>
            {scoreColumns.map((col) => (
              <th key={col.header} className="px-2 py-1">
                {col.header}
              </th>
            ))}
            {session.hasFeedback && <th className="px-2 py-1">回答狀況</th>}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((row, i) => (
            <tr key={row.id} className="border-b border-zinc-300 text-center">
              <td className="tabular px-2 py-1">{i + 1}</td>
              <td className="tabular px-2 py-1">{row.student.studentId || "-"}</td>
              <td className="px-2 py-1">{row.student.name}</td>
              <td className="px-2 py-1">{row.student.chineseName || "-"}</td>
              <td className="px-2 py-1">{attendanceByEnrollment.get(row.id)?.note || "完整"}</td>
              {scoreColumns.map((col) => (
                <td key={col.header} className="tabular px-2 py-1">
                  {col.get(row.id)}
                </td>
              ))}
              {session.hasFeedback && <td className="px-2 py-1">{feedbackByEnrollment.get(row.id) || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
