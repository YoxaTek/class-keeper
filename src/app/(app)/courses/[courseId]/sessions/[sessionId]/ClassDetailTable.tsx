"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import type {
  Assessment,
  Attendance,
  AttendanceStatus,
  Enrollment,
  ScoreRecord,
  SessionFeedback,
  Session,
  Student,
} from "@prisma/client";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";
import { assessmentDisplayLabel } from "@/lib/assessmentLabel";
import { Button } from "@/components/ui/Button";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";
import { ClassAttendancePdfTable } from "@/components/ClassAttendancePdfTable";

type Row = Enrollment & {
  student: Student;
  attendance: Attendance[];
  scores: ScoreRecord[];
  sessionFeedback: SessionFeedback[];
};
type ScoreCategory = "QUIZ" | "ASSIGNMENT" | "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL";
type ScoreState = { original: string; retake: string };
// Which specific score a field edits — `key` is the assessmentId for
// QUIZ/ASSIGNMENT (a session can have more than one of each) or just the
// category string for MIDTERM_READING/MIDTERM_LISTENING/FINAL, which stay
// exactly one per session and have no assessmentId.
type ScoreTarget = { key: string; category: ScoreCategory; assessmentId: string | null };

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["PRESENT", "EXCUSED", "ABSENT", "NOT_ENROLLED"];

export function ClassDetailTable({
  sessionId,
  pdfTitle,
  session,
  assessments,
  enrollments,
}: {
  sessionId: string;
  pdfTitle: string;
  session: Pick<Session, "hasAttendance" | "hasMidterm" | "midtermMaxScore" | "hasFinal" | "finalMaxScore" | "hasFeedback">;
  /** This session's quiz/assignment instances — any number of each. */
  assessments: Assessment[];
  enrollments: Row[];
}) {
  const t = useTranslations();

  const quizzes = [...assessments].filter((a) => a.type === "QUIZ").sort((a, b) => a.order - b.order);
  const classAssignments = [...assessments].filter((a) => a.type === "ASSIGNMENT").sort((a, b) => a.order - b.order);

  const [rowState] = useState(() => {
    const state = new Map<
      string,
      {
        attendance: AttendanceStatus | undefined;
        attendanceNote: string;
        scores: Map<string, ScoreState>;
        feedback: string;
      }
    >();
    for (const row of enrollments) {
      const scores = new Map<string, ScoreState>();
      for (const s of row.scores) {
        scores.set(s.assessmentId ?? s.category, {
          original: s.originalScore?.toString() ?? "",
          retake: s.retakeScore?.toString() ?? "",
        });
      }
      state.set(row.id, {
        attendance: row.attendance[0]?.status,
        attendanceNote: row.attendance[0]?.note ?? "",
        scores,
        feedback: row.sessionFeedback[0]?.note ?? "",
      });
    }
    return state;
  });
  const [, forceRender] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | AttendanceStatus>("ALL");
  // Field edits update local state immediately but only reach the server on
  // Save — one pending PUT body per (row, field), so re-editing before
  // saving just overwrites the queued request instead of stacking more.
  const pending = useRef(new Map<string, { url: string; body: object }>());

  function setAttendance(enrollmentId: string, status: AttendanceStatus) {
    const row = rowState.get(enrollmentId)!;
    row.attendance = status;
    pending.current.set(`attendance:${enrollmentId}`, {
      url: "/api/attendance",
      body: { sessionId, enrollmentId, status, note: row.attendanceNote || null },
    });
    setDirtyCount(pending.current.size);
    forceRender((n) => n + 1);
  }

  // A note on the attendance record itself — why late, why excused, etc.
  // Distinct from session feedback (see FeedbackInput), which is a general
  // note unrelated to attendance specifically.
  function setAttendanceNote(enrollmentId: string, note: string) {
    const row = rowState.get(enrollmentId);
    if (!row) return;
    row.attendanceNote = note;
    pending.current.set(`attendance:${enrollmentId}`, {
      url: "/api/attendance",
      body: { sessionId, enrollmentId, status: row.attendance ?? "ABSENT", note: note || null },
    });
    setDirtyCount(pending.current.size);
    forceRender((n) => n + 1);
  }

  function setScore(enrollmentId: string, target: ScoreTarget, field: keyof ScoreState, rawValue: string) {
    const row = rowState.get(enrollmentId);
    if (!row) return;
    const current = row.scores.get(target.key) ?? { original: "", retake: "" };
    const next = { ...current, [field]: rawValue };
    row.scores.set(target.key, next);
    pending.current.set(`score:${enrollmentId}:${target.key}`, {
      url: "/api/scores",
      body: {
        sessionId,
        enrollmentId,
        category: target.category,
        assessmentId: target.assessmentId,
        originalScore: next.original === "" ? null : Number(next.original),
        retakeScore: next.retake === "" ? null : Number(next.retake),
        // A retake is always scored out of the same total as the original —
        // there's no separate "out of" input for it any more.
        retakeMaxScore: null,
      },
    });
    setDirtyCount(pending.current.size);
    forceRender((n) => n + 1);
  }

  function setFeedback(enrollmentId: string, note: string) {
    const row = rowState.get(enrollmentId);
    if (!row) return;
    row.feedback = note;
    pending.current.set(`feedback:${enrollmentId}`, {
      url: "/api/session-feedback",
      body: { sessionId, enrollmentId, note },
    });
    setDirtyCount(pending.current.size);
    forceRender((n) => n + 1);
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all(
      [...pending.current.values()].map(({ url, body }) =>
        fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      )
    );
    pending.current.clear();
    setDirtyCount(0);
    setSaving(false);
  }

  const dirty = dirtyCount > 0;

  // Built from the live rowState, not the original `enrollments` prop —
  // that prop is a one-time snapshot from when the page loaded, so a save
  // (which only PUTs to the API, it never refetches this page) left the
  // export permanently showing pre-edit values until a full reload. Every
  // edit already updates rowState synchronously, so reading from there
  // instead means the export always matches what's on screen.
  const assessmentById = new Map(assessments.map((a) => [a.id, a]));
  const pdfEnrollments = enrollments.map((row) => ({ id: row.id, student: row.student }));
  const pdfAttendance = enrollments.map((row) => {
    const state = rowState.get(row.id)!;
    return { enrollmentId: row.id, status: state.attendance ?? "ABSENT", note: state.attendanceNote || null };
  });
  const pdfScores = enrollments.flatMap((row) => {
    const state = rowState.get(row.id)!;
    return [...state.scores.entries()]
      .filter(([, value]) => value.original !== "" || value.retake !== "")
      .map(([key, value]) => {
        const assessment = assessmentById.get(key);
        return {
          enrollmentId: row.id,
          category: assessment ? assessment.type : (key as ScoreCategory),
          assessmentId: assessment?.id ?? null,
          originalScore: value.original === "" ? null : Number(value.original),
          retakeScore: value.retake === "" ? null : Number(value.retake),
          retakeMaxScore: null,
        };
      });
  });
  const pdfFeedback = enrollments
    .map((row) => ({ enrollmentId: row.id, note: rowState.get(row.id)!.feedback }))
    .filter((f) => f.note !== "");

  // Viewing-only — the PDF export above always includes every student
  // regardless of this filter, since it's the official record.
  const visibleEnrollments =
    session.hasAttendance && attendanceFilter !== "ALL"
      ? enrollments.filter((row) => (rowState.get(row.id)?.attendance ?? "ABSENT") === attendanceFilter)
      : enrollments;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {session.hasAttendance ? (
          <div className="flex flex-wrap gap-1">
            {(["ALL", "PRESENT", "ABSENT", "EXCUSED", "NOT_ENROLLED"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAttendanceFilter(f)}
                aria-pressed={attendanceFilter === f}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  attendanceFilter === f
                    ? "bg-[#0f6e56]/10 font-medium text-[#0f6e56] dark:text-teal-400"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
                }`}
              >
                {f === "ALL" ? t("sessions.filterAll") : t(`attendanceStatus.${f}`)}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          {dirty && !saving && <span className="text-sm text-zinc-500 dark:text-zinc-500">{t("sessions.unsavedChanges")}</span>}
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            {t("sessions.exportPdf")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
      {/* Cards: one card per student, at every screen width — same fields
          the old table had, just stacked instead of columned. */}
      <div className="grid grid-cols-1 gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-3">
        {visibleEnrollments.map((row) => {
          const state = rowState.get(row.id)!;
          const reading = state.scores.get("MIDTERM_READING") ?? { original: "", retake: "" };
          const listening = state.scores.get("MIDTERM_LISTENING") ?? { original: "", retake: "" };
          const final = state.scores.get("FINAL") ?? { original: "", retake: "" };

          return (
            <div key={row.id} className={`${cardClass} space-y-3 p-4`}>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.student.name}
                {row.student.chineseName && (
                  <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-500">{row.student.chineseName}</span>
                )}
              </div>

              {session.hasAttendance && (
                <div className="space-y-1">
                  <label className={labelClass}>{t("sessions.attendance")}</label>
                  <AttendanceControl
                    status={state.attendance ?? "ABSENT"}
                    note={state.attendanceNote}
                    onChange={(status) => setAttendance(row.id, status)}
                    onNoteChange={(note) => setAttendanceNote(row.id, note)}
                    t={t}
                  />
                </div>
              )}

              {quizzes.map((a, i) => {
                const target: ScoreTarget = { key: a.id, category: "QUIZ", assessmentId: a.id };
                const quiz = state.scores.get(a.id) ?? { original: "", retake: "" };
                return (
                  <div key={a.id} className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelClass}>
                        {assessmentDisplayLabel(t("sessions.quiz"), a, i, quizzes.length)}{" "}
                        <span className="text-zinc-400">/ {a.maxScore}</span>
                      </label>
                      <NumberInput
                        value={quiz.original}
                        max={a.maxScore}
                        onCommit={(v) => setScore(row.id, target, "original", v)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>{t("grid.retake")}</label>
                      <NumberInput
                        value={quiz.retake}
                        max={a.maxScore}
                        onCommit={(v) => setScore(row.id, target, "retake", v)}
                        className="w-full"
                      />
                    </div>
                  </div>
                );
              })}

              {classAssignments.map((a, i) => {
                const target: ScoreTarget = { key: a.id, category: "ASSIGNMENT", assessmentId: a.id };
                const assignment = state.scores.get(a.id) ?? { original: "", retake: "" };
                return (
                  <div key={a.id} className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelClass}>
                        {assessmentDisplayLabel(t("sessions.assignment"), a, i, classAssignments.length)}{" "}
                        <span className="text-zinc-400">/ {a.maxScore}</span>
                      </label>
                      <NumberInput
                        value={assignment.original}
                        max={a.maxScore}
                        onCommit={(v) => setScore(row.id, target, "original", v)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>{t("grid.retake")}</label>
                      <NumberInput
                        value={assignment.retake}
                        max={a.maxScore}
                        onCommit={(v) => setScore(row.id, target, "retake", v)}
                        className="w-full"
                      />
                    </div>
                  </div>
                );
              })}

              {session.hasMidterm && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelClass}>
                        閱讀 <span className="text-zinc-400">/ {session.midtermMaxScore / 2}</span>
                      </label>
                      <NumberInput
                        value={reading.original}
                        max={session.midtermMaxScore / 2}
                        onCommit={(v) =>
                          setScore(row.id, { key: "MIDTERM_READING", category: "MIDTERM_READING", assessmentId: null }, "original", v)
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>{t("grid.retake")}</label>
                      <NumberInput
                        value={reading.retake}
                        max={session.midtermMaxScore / 2}
                        onCommit={(v) =>
                          setScore(row.id, { key: "MIDTERM_READING", category: "MIDTERM_READING", assessmentId: null }, "retake", v)
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelClass}>
                        聽力 <span className="text-zinc-400">/ {session.midtermMaxScore / 2}</span>
                      </label>
                      <NumberInput
                        value={listening.original}
                        max={session.midtermMaxScore / 2}
                        onCommit={(v) =>
                          setScore(row.id, { key: "MIDTERM_LISTENING", category: "MIDTERM_LISTENING", assessmentId: null }, "original", v)
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>{t("grid.retake")}</label>
                      <NumberInput
                        value={listening.retake}
                        max={session.midtermMaxScore / 2}
                        onCommit={(v) =>
                          setScore(row.id, { key: "MIDTERM_LISTENING", category: "MIDTERM_LISTENING", assessmentId: null }, "retake", v)
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {session.hasFinal && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelClass}>
                      {t("sessions.final")} <span className="text-zinc-400">/ {session.finalMaxScore}</span>
                    </label>
                    <NumberInput
                      value={final.original}
                      max={session.finalMaxScore}
                      onCommit={(v) => setScore(row.id, { key: "FINAL", category: "FINAL", assessmentId: null }, "original", v)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>{t("grid.retake")}</label>
                    <NumberInput
                      value={final.retake}
                      max={session.finalMaxScore}
                      onCommit={(v) => setScore(row.id, { key: "FINAL", category: "FINAL", assessmentId: null }, "retake", v)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {session.hasFeedback && (
                <div className="space-y-1">
                  <label className={labelClass}>{t("sessions.feedback")}</label>
                  <FeedbackInput value={state.feedback} onCommit={(v) => setFeedback(row.id, v)} />
                </div>
              )}
            </div>
          );
        })}
        {visibleEnrollments.length === 0 && (
          <div className={`${cardClass} px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500`}>—</div>
        )}
      </div>

      {/* Print/export-only. */}
      <div className="hidden print:block">
        <ClassAttendancePdfTable
          title={pdfTitle}
          session={session}
          assessments={assessments}
          enrollments={pdfEnrollments}
          attendance={pdfAttendance}
          scores={pdfScores}
          sessionFeedback={pdfFeedback}
        />
      </div>
    </div>
  );
}

// Unwrapped controls (no <td>) so the same input UI works in both the
// desktop table and the mobile card layout below.
function AttendanceControl({
  status,
  note,
  onChange,
  onNoteChange,
  t,
}: {
  status: AttendanceStatus;
  note: string;
  onChange: (status: AttendanceStatus) => void;
  onNoteChange: (note: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-1">
      <div role="radiogroup" aria-label={t("sessions.attendance")} className="grid grid-cols-2 gap-1">
        {ATTENDANCE_OPTIONS.map((s) => {
          const Icon = attendanceIcon[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s)}
              className={`flex items-center justify-center gap-1.5 rounded border py-1.5 text-xs transition-colors ${
                active
                  ? `border-current bg-current/10 ${attendanceColor[s]}`
                  : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t(`attendanceStatus.${s}`)}
            </button>
          );
        })}
      </div>
      <input
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={t("sessions.attendanceNotePlaceholder")}
        className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 placeholder:text-zinc-300 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:hover:border-zinc-600"
      />
    </div>
  );
}

function clampScore(raw: string, max?: number) {
  if (raw === "") return raw;
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  const bounded = Math.min(Math.max(n, 0), max ?? Infinity);
  return String(bounded);
}

// Controlled directly by the parent's committed state (no local draft) so
// every keystroke marks the row dirty and enables Save immediately — only
// the clamp-to-bounds pass waits for blur, since it reformats the value.
function NumberInput({
  value,
  max,
  onCommit,
  className = "",
}: {
  value: string;
  max?: number;
  onCommit: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      onBlur={() => {
        const clamped = clampScore(value, max);
        if (clamped !== value) onCommit(clamped);
      }}
      className={`tabular w-20 rounded border border-zinc-200 bg-white px-1.5 py-1 text-left text-sm text-zinc-900 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 ${className}`}
    />
  );
}

function FeedbackInput({
  value,
  onCommit,
  className = "",
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      rows={2}
      className={`${inputClass} resize-y ${className}`}
    />
  );
}

