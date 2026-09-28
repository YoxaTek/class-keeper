"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { pctFor, scoreRecordMax } from "@/lib/grading/calculateGrade";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
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

// Order the compact icon row reads left-to-right in the redesigned card.
const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED", "NOT_ENROLLED"];

// A second-actual-button-inside-a-button is invalid HTML, and every
// expanded field's label in the redesign is a tiny uppercase caption —
// distinct enough from the app's normal form `labelClass` that it's kept
// local to this component rather than folded into the shared one.
const fieldLabelClass = "text-[9.5px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500";

// Design tokens for this page's dark theme (from the design's :root custom
// properties): bg/surface-2 #09090b = zinc-950, surface #18181b = zinc-900,
// border #27272a = zinc-800, border-soft #3f3f46 = zinc-700, text/text-2/
// text-3 = zinc-100/400/500, accent #0f6e56, accent-text = teal-400,
// red = red-400, amber = amber-400 — the exact matching Tailwind zinc/teal/
// red/amber shades, deliberately no purple/indigo: the palette is "zinc,
// teal, red, amber — nothing else." Light-mode equivalents aren't part of
// that spec (the mockups are all dark) so they keep this page's existing,
// slightly deeper shades for contrast against a white background.

// Solid-fill counterparts of attendanceColor's text-only palette, for the
// compact status buttons (filled when selected, muted otherwise). Present
// stays the flat accent color in both themes (it's already dark enough to
// read against near-black); not-enrolled gets no color at all — border-soft
// gray — since the palette has no fifth hue for it.
const attendanceFill: Record<AttendanceStatus, string> = {
  PRESENT: "bg-[#0f6e56] text-white",
  EXCUSED: "bg-amber-500 text-white dark:bg-amber-400 dark:text-zinc-950",
  ABSENT: "bg-red-600 text-white dark:bg-red-400",
  NOT_ENROLLED: "bg-zinc-600 text-white dark:bg-zinc-700",
};

// The shared attendanceColor's NOT_ENROLLED is indigo (used elsewhere in
// the app) — off-palette for this page's "zinc, teal, red, amber" rule, so
// this page uses a neutral muted color for that one status instead.
const statusTextColor: Record<AttendanceStatus, string> = {
  PRESENT: attendanceColor.PRESENT,
  EXCUSED: attendanceColor.EXCUSED,
  ABSENT: attendanceColor.ABSENT,
  NOT_ENROLLED: "text-zinc-500 dark:text-zinc-400",
};

// The design's cards use a noticeably larger corner radius than the app's
// shared cardClass — kept local to this page rather than widening
// cardClass itself, which other pages' cards still use as-is. An expanded
// card's outer border is border-soft (zinc-700) rather than the default
// divider gray, per the design tokens.
function studentCardClass(expanded: boolean) {
  return `rounded-2xl border bg-white dark:bg-zinc-900 ${
    expanded ? "border-zinc-300 dark:border-zinc-700" : "border-zinc-200 dark:border-zinc-800"
  }`;
}

// Same reasoning as studentCardClass, applied to text inputs — the shared
// inputClass's rounded-md would look inconsistent next to these bigger
// card/icon radii, and its dark:bg-zinc-900 matches the card surface
// itself rather than sitting recessed below it (surface-2, zinc-950, per
// the design tokens) — but other pages' forms still want inputClass as-is.
// text-sm is stripped too: the mockup's own type scale gives each field
// its own size (see each usage site) rather than one shared size here.
const fieldInputClass = inputClass
  .replace("rounded-md", "rounded-lg")
  .replace("dark:bg-zinc-900", "dark:bg-zinc-950")
  .replace(" text-sm", "");

// First letter of each of the first two words ("Tommy Lin" → "TL"); a
// single-word name/username just takes its first two characters.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function avgScoreColor(pct: number): string {
  if (pct < 60) return "text-red-600 dark:text-red-400";
  if (pct >= 80) return "text-[#0f6e56] dark:text-teal-400";
  return "text-zinc-500 dark:text-zinc-400";
}

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
  // Which cards are expanded — independent per card, any number open at once.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Picking a status on a (possibly collapsed) card gives no feedback where
  // it landed unless the card is open — so the subtitle briefly rolls up to
  // show the status text, then rolls back to its normal text on its own.
  // Keyed by enrollmentId; the ref tracks each row's pending revert timer so
  // a second pick before the first reverts just restarts the clock.
  const [flashStatus, setFlashStatus] = useState<Map<string, AttendanceStatus>>(new Map());
  const flashTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  // Field edits update local state immediately but only reach the server on
  // Save — one pending PUT body per (row, field), so re-editing before
  // saving just overwrites the queued request instead of stacking more.
  const pending = useRef(new Map<string, { url: string; body: object }>());

  function toggleExpanded(enrollmentId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  }

  function setAttendance(enrollmentId: string, status: AttendanceStatus) {
    const row = rowState.get(enrollmentId)!;
    row.attendance = status;
    pending.current.set(`attendance:${enrollmentId}`, {
      url: "/api/attendance",
      body: { sessionId, enrollmentId, status, note: row.attendanceNote || null },
    });
    setDirtyCount(pending.current.size);

    setFlashStatus((prev) => new Map(prev).set(enrollmentId, status));
    clearTimeout(flashTimers.current.get(enrollmentId));
    flashTimers.current.set(
      enrollmentId,
      setTimeout(() => {
        setFlashStatus((prev) => {
          const next = new Map(prev);
          next.delete(enrollmentId);
          return next;
        });
        flashTimers.current.delete(enrollmentId);
      }, 1600)
    );

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

  // This session's own average score for one student — the average of
  // that student's recorded (original, or retake when present) scores as
  // a percentage of each one's own total, matching the convention the
  // class list's "Score avg." already uses. null when nothing is graded.
  function sessionAvgScore(row: Row): number | null {
    const state = rowState.get(row.id)!;
    const entries = [...state.scores.entries()].filter(([, v]) => v.original !== "" || v.retake !== "");
    if (entries.length === 0) return null;
    const pcts = entries.map(([key, v]) => {
      const assessment = assessmentById.get(key);
      const record = {
        category: (assessment ? assessment.type : (key as ScoreCategory)) as ScoreCategory,
        assessmentId: assessment?.id ?? null,
        originalScore: v.original === "" ? null : Number(v.original),
        retakeScore: v.retake === "" ? null : Number(v.retake),
        retakeMaxScore: null,
      };
      return pctFor(record, scoreRecordMax(record, session, assessmentById));
    });
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
  }

  // Viewing-only — the PDF export above always includes every student
  // regardless of this filter, since it's the official record.
  const visibleEnrollments =
    session.hasAttendance && attendanceFilter !== "ALL"
      ? enrollments.filter((row) => (rowState.get(row.id)?.attendance ?? "ABSENT") === attendanceFilter)
      : enrollments;

  const attendanceCounts = new Map<AttendanceStatus, number>();
  for (const row of enrollments) {
    const status = rowState.get(row.id)?.attendance ?? "ABSENT";
    attendanceCounts.set(status, (attendanceCounts.get(status) ?? 0) + 1);
  }
  const totalCount = enrollments.length;

  return (
    <div className="flex min-h-full flex-col gap-3">
      {session.hasAttendance && (
        <div className="flex flex-wrap gap-1 print:hidden">
          {(["ALL", "PRESENT", "ABSENT", "EXCUSED", "NOT_ENROLLED"] as const).map((f) => {
            const count = f === "ALL" ? totalCount : attendanceCounts.get(f) ?? 0;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setAttendanceFilter(f)}
                aria-pressed={attendanceFilter === f}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] transition-colors ${
                  attendanceFilter === f
                    ? "bg-[#0f6e56]/10 font-medium text-[#0f6e56] dark:bg-[rgba(45,212,191,0.12)] dark:text-teal-400"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
                }`}
              >
                {f === "ALL" ? t("sessions.filterAll") : t(`attendanceStatus.${f}`)}
                <span
                  className={`tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11.5px] ${
                    attendanceFilter === f
                      ? "bg-[#0f6e56]/15 text-[#0f6e56] dark:bg-teal-400/20 dark:text-teal-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* One row per student, full width at every screen size — tap a
          name to expand it for editing; any number can be open at once. */}
      <div className="space-y-2 print:hidden">
        {visibleEnrollments.map((row) => {
          const state = rowState.get(row.id)!;
          const status = state.attendance ?? "ABSENT";
          const isExpanded = expanded.has(row.id);
          const reading = state.scores.get("MIDTERM_READING") ?? { original: "", retake: "" };
          const listening = state.scores.get("MIDTERM_LISTENING") ?? { original: "", retake: "" };
          const final = state.scores.get("FINAL") ?? { original: "", retake: "" };

          const avg = sessionAvgScore(row);
          const scoreSummary =
            status === "NOT_ENROLLED"
              ? t("sessions.notEnrolledThisSession")
              : avg === null
                ? t("sessions.notGraded")
                : t("sessions.avgScore", { pct: Math.round(avg) });
          const scoreSummaryColor =
            status === "NOT_ENROLLED" || avg === null ? "text-zinc-500 dark:text-zinc-400" : avgScoreColor(avg);
          // The subtitle always shows the score summary — expanding never
          // swaps it to attendance. A just-picked status takes the slot
          // over briefly instead (see setAttendance), regardless of expand
          // state, then reverts on its own.
          const flashed = flashStatus.get(row.id);
          const attendanceSummary = state.attendanceNote
            ? `${t(`attendanceStatus.${status}`)} — ${state.attendanceNote}`
            : t(`attendanceStatus.${status}`);
          const subtitleText = flashed ? attendanceSummary : scoreSummary;
          const subtitleColor = flashed ? statusTextColor[status] : scoreSummaryColor;

          return (
            <div key={row.id} className={studentCardClass(isExpanded)}>
              <div className="flex items-center gap-3 px-4 pt-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {initials(row.student.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">
                      {row.student.name}
                      {row.student.chineseName && (
                        <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">{row.student.chineseName}</span>
                      )}
                    </div>
                    <RollingSubtitle text={subtitleText} color={subtitleColor} animateToken={flashed ?? "normal"} />
                  </div>
                </button>

                {session.hasAttendance && (
                  <div className="flex shrink-0 gap-1">
                    {ATTENDANCE_OPTIONS.map((s) => {
                      const Icon = attendanceIcon[s];
                      const active = status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-label={t(`attendanceStatus.${s}`)}
                          aria-pressed={active}
                          onClick={() => setAttendance(row.id, s)}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors ${
                            active
                              ? attendanceFill[s]
                              : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-500 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* A full-width bar at the bottom of the card, in both states —
                  not just a small corner icon — so it's obvious the whole
                  card is tappable to expand, not only the name/avatar. */}
              {!isExpanded && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-center gap-1 pb-2 text-[10.5px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  {t("sessions.tapToExpand")}
                </button>
              )}

              {isExpanded && (
                <div className="px-4 pt-3 pb-4">
                  {/* An inset divider inside the padded content — not a
                      full-bleed border on the section itself — so it's the
                      same width as the fields below it, with breathing room
                      above (this div's own pt-3) and none below: it sits
                      outside the field groups' own space-y-3 rhythm, flush
                      against the first one instead of adding another gap. */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <div className="space-y-3">
                    {session.hasAttendance && (
                      <div className="space-y-1">
                        <label className={fieldLabelClass}>{t("sessions.attendanceNoteLabel")}</label>
                        <input
                          value={state.attendanceNote}
                          onChange={(e) => setAttendanceNote(row.id, e.target.value)}
                          placeholder={t("sessions.attendanceNotePlaceholder")}
                          className={`${fieldInputClass} text-[12px]`}
                        />
                      </div>
                    )}

                    {quizzes.map((a, i) => {
                      const target: ScoreTarget = { key: a.id, category: "QUIZ", assessmentId: a.id };
                      const quiz = state.scores.get(a.id) ?? { original: "", retake: "" };
                      return (
                        <div key={a.id} className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className={fieldLabelClass}>
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
                            <label className={fieldLabelClass}>{t("grid.retake")}</label>
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
                            <label className={fieldLabelClass}>
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
                            <label className={fieldLabelClass}>{t("grid.retake")}</label>
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
                            <label className={fieldLabelClass}>
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
                            <label className={fieldLabelClass}>{t("grid.retake")}</label>
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
                            <label className={fieldLabelClass}>
                              聽力 <span className="text-zinc-400">/ {session.midtermMaxScore / 2}</span>
                            </label>
                            <NumberInput
                              value={listening.original}
                              max={session.midtermMaxScore / 2}
                              onCommit={(v) =>
                                setScore(
                                  row.id,
                                  { key: "MIDTERM_LISTENING", category: "MIDTERM_LISTENING", assessmentId: null },
                                  "original",
                                  v
                                )
                              }
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className={fieldLabelClass}>{t("grid.retake")}</label>
                            <NumberInput
                              value={listening.retake}
                              max={session.midtermMaxScore / 2}
                              onCommit={(v) =>
                                setScore(
                                  row.id,
                                  { key: "MIDTERM_LISTENING", category: "MIDTERM_LISTENING", assessmentId: null },
                                  "retake",
                                  v
                                )
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
                          <label className={fieldLabelClass}>
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
                          <label className={fieldLabelClass}>{t("grid.retake")}</label>
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
                        <label className={fieldLabelClass}>{t("sessions.feedback")}</label>
                        <FeedbackInput value={state.feedback} onCommit={(v) => setFeedback(row.id, v)} />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpanded(row.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-center gap-1 pt-1 text-[10.5px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                    >
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      {t("sessions.tapToCollapse")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visibleEnrollments.length === 0 && (
          <div className={`${studentCardClass(false)} px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500`}>—</div>
        )}
      </div>

      {/* mt-auto pins this to the bottom of the (min-h-full) flex column
          even when the roster is short enough that the page doesn't
          scroll; sticky bottom-0 then keeps it on screen instead of
          scrolling away once a longer roster does need to scroll. */}
      <div
        className={`sticky bottom-0 z-10 -mx-3 mt-auto flex items-center justify-between gap-3 border-t px-3 py-3 backdrop-blur transition-colors print:hidden ${
          dirty
            ? "border-amber-400 bg-amber-50/95 dark:border-amber-500/60 dark:bg-amber-950/30"
            : "border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95"
        }`}
      >
        <span className="flex items-center gap-2 text-[11.5px] text-zinc-600 dark:text-zinc-400">
          {dirty && !saving && (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inset-0 rounded-full bg-amber-500"
                  style={{ animation: "dot-wave 2s ease-out infinite" }}
                />
                <span className="relative h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {t("sessions.unsavedChanges")}
            </>
          )}
        </span>
        <Button type="button" variant="primary" size="lg" rounded="full" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
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

// A fixed-height, overflow-hidden slot that shows `text` — when `animateToken`
// changes (a status flash starting or reverting — see setAttendance), the
// old value rolls up and out (text-roll-out) while the new value rolls up
// into its place from below (text-roll-in) at the same time, instead of the
// outgoing text just vanishing the instant the incoming one appears. `text`
// can also change for unrelated reasons (expanding/collapsing the card
// swaps which summary is shown) — animateToken staying the same then just
// swaps the text in place, with no roll.
function RollingSubtitle({ text, color, animateToken }: { text: string; color: string; animateToken: string }) {
  const [current, setCurrent] = useState({ text, color, token: animateToken });
  const [exiting, setExiting] = useState<{ text: string; color: string } | null>(null);

  // Adjusting state during render when a prop changes (React's documented
  // pattern for this — see "You Might Not Need an Effect") rather than in
  // an effect: it takes effect before the browser paints, so the outgoing
  // and incoming text animate in the same frame instead of one frame apart.
  if (animateToken !== current.token) {
    setExiting({ text: current.text, color: current.color });
    setCurrent({ text, color, token: animateToken });
  } else if (text !== current.text || color !== current.color) {
    setCurrent({ text, color, token: animateToken });
  }

  // The timer is a real subscription (reacting to `exiting` from outside
  // React), so it belongs in an effect, unlike the state adjustment above.
  useEffect(() => {
    if (!exiting) return;
    const timeoutId = setTimeout(() => setExiting(null), 220);
    return () => clearTimeout(timeoutId);
  }, [exiting]);

  return (
    <div className="relative h-4 overflow-hidden">
      {exiting && (
        <div
          className={`absolute inset-x-0 top-0 truncate text-[10.5px] ${exiting.color}`}
          style={{ animation: "text-roll-out 220ms ease-in forwards" }}
        >
          {exiting.text}
        </div>
      )}
      <div
        className={`truncate text-[10.5px] ${current.color}`}
        style={exiting ? { animation: "text-roll-in 220ms ease-out" } : undefined}
      >
        {current.text}
      </div>
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
      className={`tabular w-20 rounded-lg border border-zinc-200 bg-white px-1.5 py-1 text-left text-[13px] text-zinc-900 hover:border-zinc-300 focus:border-[#0f6e56] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 ${className}`}
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
      className={`${fieldInputClass} resize-y text-[11.5px] ${className}`}
    />
  );
}
