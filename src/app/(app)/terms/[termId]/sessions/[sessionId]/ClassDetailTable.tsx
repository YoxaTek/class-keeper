"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { Attendance, AttendanceStatus, Enrollment, ScoreRecord, SessionFeedback, Session, Student } from "@prisma/client";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";
import { Button } from "@/components/ui/Button";
import { cardClass, inputClass } from "@/components/ui/styles";

type Row = Enrollment & {
  student: Student;
  attendance: Attendance[];
  scores: ScoreRecord[];
  sessionFeedback: SessionFeedback[];
};
type ScoreCategory = "QUIZ" | "ASSIGNMENT" | "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL";
type ScoreState = { original: string; retake: string; retakeMax: string };

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["PRESENT", "EXCUSED", "ABSENT", "NOT_ENROLLED"];

export function ClassDetailTable({
  sessionId,
  session,
  enrollments,
}: {
  sessionId: string;
  session: Pick<
    Session,
    | "hasAttendance"
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
  enrollments: Row[];
}) {
  const t = useTranslations();

  const [rowState] = useState(() => {
    const state = new Map<
      string,
      { attendance: AttendanceStatus | undefined; scores: Map<ScoreCategory, ScoreState>; feedback: string }
    >();
    for (const row of enrollments) {
      const scores = new Map<ScoreCategory, ScoreState>();
      for (const s of row.scores) {
        scores.set(s.category as ScoreCategory, {
          original: s.originalScore?.toString() ?? "",
          retake: s.retakeScore?.toString() ?? "",
          retakeMax: s.retakeMaxScore?.toString() ?? "",
        });
      }
      state.set(row.id, {
        attendance: row.attendance[0]?.status,
        scores,
        feedback: row.sessionFeedback[0]?.note ?? "",
      });
    }
    return state;
  });
  const [, forceRender] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  // Field edits update local state immediately but only reach the server on
  // Save — one pending PUT body per (row, field), so re-editing before
  // saving just overwrites the queued request instead of stacking more.
  const pending = useRef(new Map<string, { url: string; body: object }>());

  function setAttendance(enrollmentId: string, status: AttendanceStatus) {
    rowState.get(enrollmentId)!.attendance = status;
    pending.current.set(`attendance:${enrollmentId}`, {
      url: "/api/attendance",
      body: { sessionId, enrollmentId, status },
    });
    setDirtyCount(pending.current.size);
    forceRender((n) => n + 1);
  }

  function setScore(enrollmentId: string, category: ScoreCategory, field: keyof ScoreState, rawValue: string) {
    const row = rowState.get(enrollmentId);
    if (!row) return;
    const current = row.scores.get(category) ?? { original: "", retake: "", retakeMax: "" };
    const next = { ...current, [field]: rawValue };
    row.scores.set(category, next);
    pending.current.set(`score:${enrollmentId}:${category}`, {
      url: "/api/scores",
      body: {
        sessionId,
        enrollmentId,
        category,
        originalScore: next.original === "" ? null : Number(next.original),
        retakeScore: next.retake === "" ? null : Number(next.retake),
        retakeMaxScore: next.retakeMax === "" ? null : Number(next.retakeMax),
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        {dirty && !saving && <span className="text-sm text-zinc-500 dark:text-zinc-500">{t("sessions.unsavedChanges")}</span>}
        <Button type="button" variant="primary" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>
      <div className={`overflow-x-auto ${cardClass}`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <th className="px-4 py-2">{t("grid.student")}</th>
            {session.hasAttendance && <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">{t("sessions.attendance")}</th>}
            {session.hasQuiz && (
              <>
                <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  {t("sessions.quiz")} <span className="normal-case text-zinc-400">/ {session.quizMaxScore}</span>
                </th>
                <th className="px-3 py-2">{t("grid.retake")}</th>
              </>
            )}
            {session.hasAssignment && (
              <>
                <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  {t("sessions.assignment")} <span className="normal-case text-zinc-400">/ {session.assignmentMaxScore}</span>
                </th>
                <th className="px-3 py-2">{t("grid.retake")}</th>
              </>
            )}
            {session.hasMidterm && (
              <>
                <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  閱讀 <span className="normal-case text-zinc-400">/ {session.midtermMaxScore / 2}</span>
                </th>
                <th className="px-3 py-2">{t("grid.retake")}</th>
                <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  聽力 <span className="normal-case text-zinc-400">/ {session.midtermMaxScore / 2}</span>
                </th>
                <th className="px-3 py-2">{t("grid.retake")}</th>
              </>
            )}
            {session.hasFinal && (
              <>
                <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  {t("sessions.final")} <span className="normal-case text-zinc-400">/ {session.finalMaxScore}</span>
                </th>
                <th className="px-3 py-2">{t("grid.retake")}</th>
              </>
            )}
            {session.hasFeedback && <th className="border-l border-zinc-200 px-3 py-2 dark:border-zinc-800">{t("sessions.feedback")}</th>}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-950">
          {enrollments.map((row, i) => {
            const state = rowState.get(row.id)!;
            const bg = i % 2 === 1 ? "bg-zinc-50/60 dark:bg-zinc-900/40" : "";
            const quiz = state.scores.get("QUIZ") ?? { original: "", retake: "", retakeMax: "" };
            const assignment = state.scores.get("ASSIGNMENT") ?? { original: "", retake: "", retakeMax: "" };
            const reading = state.scores.get("MIDTERM_READING") ?? { original: "", retake: "", retakeMax: "" };
            const listening = state.scores.get("MIDTERM_LISTENING") ?? { original: "", retake: "", retakeMax: "" };
            const final = state.scores.get("FINAL") ?? { original: "", retake: "", retakeMax: "" };

            return (
              <tr key={row.id} className={`border-b border-zinc-100 last:border-0 dark:border-zinc-900 ${bg}`}>
                <td className="flex items-center gap-2 px-4 py-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f6e56]/10 text-xs font-medium text-[#0f6e56] dark:text-teal-400">
                    {row.student.name.charAt(0)}
                  </span>
                  {row.student.name}
                </td>

                {session.hasAttendance && (
                  <AttendanceCell
                    status={state.attendance ?? "PRESENT"}
                    onChange={(status) => setAttendance(row.id, status)}
                    t={t}
                  />
                )}

                {session.hasQuiz && (
                  <>
                    <NumberCell
                      value={quiz.original}
                      max={session.quizMaxScore}
                      onCommit={(v) => setScore(row.id, "QUIZ", "original", v)}
                    />
                    <RetakeCell
                      obtained={quiz.retake}
                      total={quiz.retakeMax}
                      placeholder={t("grid.retake")}
                      onCommitObtained={(v) => setScore(row.id, "QUIZ", "retake", v)}
                      onCommitTotal={(v) => setScore(row.id, "QUIZ", "retakeMax", v)}
                    />
                  </>
                )}

                {session.hasAssignment && (
                  <>
                    <NumberCell
                      value={assignment.original}
                      max={session.assignmentMaxScore}
                      onCommit={(v) => setScore(row.id, "ASSIGNMENT", "original", v)}
                    />
                    <RetakeCell
                      obtained={assignment.retake}
                      total={assignment.retakeMax}
                      placeholder={t("grid.retake")}
                      onCommitObtained={(v) => setScore(row.id, "ASSIGNMENT", "retake", v)}
                      onCommitTotal={(v) => setScore(row.id, "ASSIGNMENT", "retakeMax", v)}
                    />
                  </>
                )}

                {session.hasMidterm && (
                  <>
                    <NumberCell
                      value={reading.original}
                      max={session.midtermMaxScore / 2}
                      onCommit={(v) => setScore(row.id, "MIDTERM_READING", "original", v)}
                    />
                    <RetakeCell
                      obtained={reading.retake}
                      total={reading.retakeMax}
                      placeholder={t("grid.retake")}
                      onCommitObtained={(v) => setScore(row.id, "MIDTERM_READING", "retake", v)}
                      onCommitTotal={(v) => setScore(row.id, "MIDTERM_READING", "retakeMax", v)}
                    />
                    <NumberCell
                      value={listening.original}
                      max={session.midtermMaxScore / 2}
                      onCommit={(v) => setScore(row.id, "MIDTERM_LISTENING", "original", v)}
                    />
                    <RetakeCell
                      obtained={listening.retake}
                      total={listening.retakeMax}
                      placeholder={t("grid.retake")}
                      onCommitObtained={(v) => setScore(row.id, "MIDTERM_LISTENING", "retake", v)}
                      onCommitTotal={(v) => setScore(row.id, "MIDTERM_LISTENING", "retakeMax", v)}
                    />
                  </>
                )}

                {session.hasFinal && (
                  <>
                    <NumberCell
                      value={final.original}
                      max={session.finalMaxScore}
                      onCommit={(v) => setScore(row.id, "FINAL", "original", v)}
                    />
                    <RetakeCell
                      obtained={final.retake}
                      total={final.retakeMax}
                      placeholder={t("grid.retake")}
                      onCommitObtained={(v) => setScore(row.id, "FINAL", "retake", v)}
                      onCommitTotal={(v) => setScore(row.id, "FINAL", "retakeMax", v)}
                    />
                  </>
                )}

                {session.hasFeedback && (
                  <FeedbackCell value={state.feedback} onCommit={(v) => setFeedback(row.id, v)} />
                )}
              </tr>
            );
          })}
          {enrollments.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">—</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function AttendanceCell({
  status,
  onChange,
  t,
}: {
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const Icon = attendanceIcon[status];
  return (
    <td className="border-l border-zinc-100 px-2 py-1 dark:border-zinc-900">
      <div className="relative flex items-center">
        <Icon className={`pointer-events-none absolute left-2 h-3.5 w-3.5 ${attendanceColor[status]}`} aria-hidden />
        <select
          value={status}
          onChange={(e) => onChange(e.target.value as AttendanceStatus)}
          className="w-full cursor-pointer appearance-none rounded border border-zinc-200 bg-white py-1 pl-7 pr-6 text-sm text-zinc-800 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
        >
          {ATTENDANCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`attendanceStatus.${s}`)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-400" aria-hidden />
      </div>
    </td>
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
function NumberCell({ value, max, onCommit }: { value: string; max?: number; onCommit: (value: string) => void }) {
  return (
    <td className="border-l border-zinc-100 px-2 py-1 dark:border-zinc-900">
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
        className="tabular w-20 rounded border border-zinc-200 bg-white px-1.5 py-1 text-left text-sm text-zinc-900 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
      />
    </td>
  );
}

function FeedbackCell({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  return (
    <td className="border-l border-zinc-100 px-2 py-1 dark:border-zinc-900">
      <input value={value} onChange={(e) => onCommit(e.target.value)} className={`min-w-40 ${inputClass}`} />
    </td>
  );
}

function RetakeCell({
  obtained,
  total,
  placeholder,
  onCommitObtained,
  onCommitTotal,
}: {
  obtained: string;
  total: string;
  placeholder: string;
  onCommitObtained: (value: string) => void;
  onCommitTotal: (value: string) => void;
}) {
  return (
    <td className="px-2 py-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={total === "" ? undefined : Number(total)}
          value={obtained}
          onChange={(e) => onCommitObtained(e.target.value)}
          onBlur={() => {
            const clamped = clampScore(obtained, total === "" ? undefined : Number(total));
            if (clamped !== obtained) onCommitObtained(clamped);
          }}
          placeholder={placeholder}
          className="tabular w-14 rounded border border-zinc-200 bg-white px-1 py-1 text-left text-sm text-zinc-900 placeholder:text-zinc-300 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:hover:border-zinc-600"
        />
        <span className="text-zinc-400 dark:text-zinc-600">/</span>
        <input
          type="number"
          min={0}
          value={total}
          onChange={(e) => onCommitTotal(e.target.value)}
          onBlur={() => {
            const clamped = clampScore(total);
            if (clamped !== total) onCommitTotal(clamped);
          }}
          className="tabular w-12 rounded border border-zinc-200 bg-white px-1 py-1 text-left text-sm text-zinc-500 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
        />
      </div>
    </td>
  );
}
