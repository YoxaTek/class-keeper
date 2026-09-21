"use client";

import { useTranslations } from "next-intl";
import type { AssessmentType, AttendanceStatus, ScoreCategory, Session } from "@prisma/client";
import { assessmentDisplayLabel } from "@/lib/assessmentLabel";

export type PdfEnrollment = {
  id: string;
  student: { name: string; chineseName: string | null; studentId: string | null };
};
export type PdfAttendance = { enrollmentId: string; status: AttendanceStatus; note: string | null };
export type PdfAssessment = { id: string; type: AssessmentType; label: string | null; maxScore: number; order: number };
export type PdfScore = {
  enrollmentId: string;
  category: ScoreCategory;
  assessmentId: string | null;
  originalScore: number | null;
  retakeScore: number | null;
  retakeMaxScore: number | null;
};
export type PdfFeedback = { enrollmentId: string; note: string };

const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  PRESENT: "出席",
  EXCUSED: "請假",
  ABSENT: "缺席",
  NOT_ENROLLED: "尚未加入",
};

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
  assessments,
  enrollments,
  attendance,
  scores,
  sessionFeedback,
}: {
  /** e.g. "114-2 生活華語進階班學生紀錄簿（Week12-115.05.26）" — see buildClassRecordTitle. */
  title: string;
  session: Pick<Session, "hasMidterm" | "midtermMaxScore" | "hasFinal" | "finalMaxScore" | "hasFeedback">;
  /** This session's quiz/assignment instances — any number of each, not just zero-or-one. */
  assessments: PdfAssessment[];
  enrollments: PdfEnrollment[];
  attendance: PdfAttendance[];
  scores: PdfScore[];
  sessionFeedback: PdfFeedback[];
}) {
  const t = useTranslations();

  const attendanceByEnrollment = new Map(attendance.map((a) => [a.enrollmentId, a]));
  // The actual recorded status, not a "present unless noted" default — a
  // note (e.g. why late/excused) is appended alongside it when there is one.
  const attendanceCell = (a: PdfAttendance | undefined) => {
    if (!a) return "—";
    const status = attendanceStatusLabel[a.status];
    return a.note ? `${status}（${a.note}）` : status;
  };
  // Keyed by enrollment + (assessmentId, for QUIZ/ASSIGNMENT) or category
  // (for MIDTERM_READING/MIDTERM_LISTENING/FINAL) — a session can have more
  // than one QUIZ/ASSIGNMENT score now, so category alone no longer
  // uniquely identifies a column's value.
  const scoreKey = (enrollmentId: string, key: string) => `${enrollmentId}:${key}`;
  const scoresByEnrollment = new Map<string, PdfScore>();
  for (const s of scores) {
    scoresByEnrollment.set(scoreKey(s.enrollmentId, s.assessmentId ?? s.category), s);
  }
  const feedbackByEnrollment = new Map(sessionFeedback.map((f) => [f.enrollmentId, f.note]));

  // Whichever score categories this session actually has configured — same
  // effective-score convention (retake wins if entered) used on the
  // student's own grade view, always shown against the session's own
  // total rather than a retake's possibly-different one. A blank score
  // shows a category-appropriate placeholder instead of a bare "—/max".
  const scoreColumns: { header: string; get: (enrollmentId: string) => string }[] = [];
  const scoreCell = (key: string, enrollmentId: string, max: number, emptyLabel: string) => {
    const s = scoresByEnrollment.get(scoreKey(enrollmentId, key));
    const raw = s?.retakeScore ?? s?.originalScore ?? null;
    return raw !== null ? `${raw} / ${max}` : emptyLabel;
  };

  const quizzes = assessments.filter((a) => a.type === "QUIZ").sort((a, b) => a.order - b.order);
  quizzes.forEach((a, i) => {
    scoreColumns.push({
      header: assessmentDisplayLabel("小考成績", a, i, quizzes.length),
      get: (id) => scoreCell(a.id, id, a.maxScore, "未小考"),
    });
  });
  const classAssignments = assessments.filter((a) => a.type === "ASSIGNMENT").sort((a, b) => a.order - b.order);
  classAssignments.forEach((a, i) => {
    scoreColumns.push({
      header: assessmentDisplayLabel(t("sessions.assignment"), a, i, classAssignments.length),
      get: (id) => scoreCell(a.id, id, a.maxScore, "—"),
    });
  });
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
          feature elsewhere in the app. A real @page margin (not 0) matters
          for a multi-page export: padding on the wrapper div below only
          shows up around page 1, but the @page margin applies to every
          page break, so without it pages 2+ had content jammed right up
          against the paper edge top and bottom. */}
      <style>
        {
          "@page { size: landscape; margin: 1.5cm 1cm; } table, th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }"
        }
      </style>
      <div>
      <p className="mb-2 text-center text-xl font-bold">{title}</p>
      {/* table-fixed with every column pinned to a width except 回答狀況,
          which is meant to be the widest — it absorbs whatever's left over
          (keeping the table w-full with no blank space on the right)
          instead of a fixed cap, but still wraps onto multiple lines so a
          long note doesn't force the fixed columns to shrink. */}
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="text-center">
            <th className="w-8 border border-zinc-500 px-2 py-3">#</th>
            <th className="w-24 border border-zinc-500 px-2 py-3">{t("join.studentId")}</th>
            <th className="w-32 border border-zinc-500 px-2 py-3">{t("common.name")}</th>
            <th className="w-20 border border-zinc-500 px-2 py-3">{t("common.chineseName")}</th>
            <th className="w-28 border border-zinc-500 px-2 py-3">出席狀況</th>
            {scoreColumns.map((col) => (
              <th key={col.header} className="w-24 border border-zinc-500 px-2 py-3">
                {col.header}
              </th>
            ))}
            {session.hasFeedback && <th className="border border-zinc-500 px-2 py-3 text-left">回答狀況</th>}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((row, i) => (
            <tr key={row.id} className="text-center">
              <td className="tabular border border-zinc-500 px-2 py-1">{i + 1}</td>
              <td className="tabular border border-zinc-500 px-2 py-1">{row.student.studentId || "-"}</td>
              <td className="border border-zinc-500 px-2 py-1">{row.student.name}</td>
              <td className="border border-zinc-500 px-2 py-1">{row.student.chineseName || "-"}</td>
              <td className="border border-zinc-500 px-2 py-1 break-words">{attendanceCell(attendanceByEnrollment.get(row.id))}</td>
              {scoreColumns.map((col) => (
                <td key={col.header} className="tabular border border-zinc-500 px-2 py-1">
                  {col.get(row.id)}
                </td>
              ))}
              {session.hasFeedback && (
                <td className="whitespace-normal break-words border border-zinc-500 px-2 py-1 text-left">
                  {feedbackByEnrollment.get(row.id) || "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
