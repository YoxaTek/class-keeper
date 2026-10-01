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
import { attendanceIcon, attendanceFill, attendanceTextMuted } from "@/lib/attendanceIcons";
import { assessmentDisplayLabel } from "@/lib/assessmentLabel";
import { pctFor, scoreRecordMax } from "@/lib/grading/calculateGrade";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./classDetail.module.scss";
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

// Order the compact icon row reads left-to-right in the redesigned card.
// (ATTENDANCE_OPTIONS sits above; every colour/size token lives in
// classDetail.module.scss and lib/attendanceIcons.)

// First letter of each of the first two words ("Tommy Lin" → "TL"); a
// single-word name/username just takes its first two characters.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function avgScoreColor(pct: number): string {
  if (pct < 60) return s.scoreLow;
  if (pct >= 80) return s.scoreHigh;
  return s.scoreMid;
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
    <div className={s.root}>
      {session.hasAttendance && (
        <div className={`${s.filters} ${s.noPrint}`}>
          {(["ALL", "PRESENT", "ABSENT", "EXCUSED", "NOT_ENROLLED"] as const).map((flt) => {
            const count = flt === "ALL" ? totalCount : attendanceCounts.get(flt) ?? 0;
            return (
              <button
                key={flt}
                type="button"
                onClick={() => setAttendanceFilter(flt)}
                aria-pressed={attendanceFilter === flt}
                className={`${s.filter} ${attendanceFilter === flt ? s.active : ""}`}
              >
                {flt === "ALL" ? t("sessions.filterAll") : t(`attendanceStatus.${flt}`)}
                <span className={`tabular ${s.count}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* One row per student, full width at every screen size — tap a
          name to expand it for editing; any number can be open at once. */}
      <div className={`${s.list} ${s.noPrint}`}>
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
            status === "NOT_ENROLLED" || avg === null ? s.scoreMid : avgScoreColor(avg);
          // The subtitle always shows the score summary — expanding never
          // swaps it to attendance. A just-picked status takes the slot
          // over briefly instead (see setAttendance), regardless of expand
          // state, then reverts on its own.
          const flashed = flashStatus.get(row.id);
          const attendanceSummary = state.attendanceNote
            ? `${t(`attendanceStatus.${status}`)} — ${state.attendanceNote}`
            : t(`attendanceStatus.${status}`);
          const subtitleText = flashed ? attendanceSummary : scoreSummary;
          const subtitleColor = flashed ? attendanceTextMuted[status] : scoreSummaryColor;

          return (
            <div key={row.id} className={`${s.card} ${isExpanded ? s.expanded : ""}`}>
              <div className={s.top}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.id)}
                  className={s.nameButton}
                >
                  <div className={s.avatar}>
                    {initials(row.student.name)}
                  </div>
                  <div className={s.who}>
                    <div className={s.name}>
                      {row.student.name}
                      {row.student.chineseName && (
                        <span className={s.chinese}>{row.student.chineseName}</span>
                      )}
                    </div>
                    <RollingSubtitle text={subtitleText} color={subtitleColor} animateToken={flashed ?? "normal"} />
                  </div>
                </button>

                {session.hasAttendance && (
                  <div className={s.statuses}>
                    {ATTENDANCE_OPTIONS.map((option) => {
                      const Icon = attendanceIcon[option];
                      const active = status === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-label={t(`attendanceStatus.${option}`)}
                          aria-pressed={active}
                          onClick={() => setAttendance(row.id, option)}
                          className={`${s.status} ${active ? `${s.on} ${attendanceFill[option]}` : ""}`}
                        >
                          <Icon size={14} aria-hidden />
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
                  className={s.toggle}
                >
                  <ChevronDown size={14} aria-hidden />
                  {t("sessions.tapToExpand")}
                </button>
              )}

              {isExpanded && (
                <div className={s.details}>
                  {/* An inset divider inside the padded content — not a
                      full-bleed border on the section itself — so it's the
                      same width as the fields below it, with breathing room
                      above (this div's own pt-3) and none below: it sits
                      outside the field groups' own space-y-3 rhythm, flush
                      against the first one instead of adding another gap. */}
                  <div className={s.fields}>
                    {session.hasAttendance && (
                      <div className={f.field}>
                        <label className={s.fieldLabel}>{t("sessions.attendanceNoteLabel")}</label>
                        <input
                          value={state.attendanceNote}
                          onChange={(e) => setAttendanceNote(row.id, e.target.value)}
                          placeholder={t("sessions.attendanceNotePlaceholder")}
                          className={`${inputClass} ${s.fieldInput} ${s.note}`}
                        />
                      </div>
                    )}

                    {quizzes.map((a, i) => {
                      const target: ScoreTarget = { key: a.id, category: "QUIZ", assessmentId: a.id };
                      const quiz = state.scores.get(a.id) ?? { original: "", retake: "" };
                      return (
                        <div key={a.id} className={s.pair}>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>
                              {assessmentDisplayLabel(t("sessions.quiz"), a, i, quizzes.length)}{" "}
                              <span className={s.max}>/ {a.maxScore}</span>
                            </label>
                            <NumberInput
                              value={quiz.original}
                              max={a.maxScore}
                              onCommit={(v) => setScore(row.id, target, "original", v)}
                            />
                          </div>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>{t("grid.retake")}</label>
                            <NumberInput
                              value={quiz.retake}
                              max={a.maxScore}
                              onCommit={(v) => setScore(row.id, target, "retake", v)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {classAssignments.map((a, i) => {
                      const target: ScoreTarget = { key: a.id, category: "ASSIGNMENT", assessmentId: a.id };
                      const assignment = state.scores.get(a.id) ?? { original: "", retake: "" };
                      return (
                        <div key={a.id} className={s.pair}>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>
                              {assessmentDisplayLabel(t("sessions.assignment"), a, i, classAssignments.length)}{" "}
                              <span className={s.max}>/ {a.maxScore}</span>
                            </label>
                            <NumberInput
                              value={assignment.original}
                              max={a.maxScore}
                              onCommit={(v) => setScore(row.id, target, "original", v)}
                            />
                          </div>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>{t("grid.retake")}</label>
                            <NumberInput
                              value={assignment.retake}
                              max={a.maxScore}
                              onCommit={(v) => setScore(row.id, target, "retake", v)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {session.hasMidterm && (
                      <>
                        <div className={s.pair}>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>
                              閱讀 <span className={s.max}>/ {session.midtermMaxScore / 2}</span>
                            </label>
                            <NumberInput
                              value={reading.original}
                              max={session.midtermMaxScore / 2}
                              onCommit={(v) =>
                                setScore(row.id, { key: "MIDTERM_READING", category: "MIDTERM_READING", assessmentId: null }, "original", v)
                              }
                            />
                          </div>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>{t("grid.retake")}</label>
                            <NumberInput
                              value={reading.retake}
                              max={session.midtermMaxScore / 2}
                              onCommit={(v) =>
                                setScore(row.id, { key: "MIDTERM_READING", category: "MIDTERM_READING", assessmentId: null }, "retake", v)
                              }
                            />
                          </div>
                        </div>
                        <div className={s.pair}>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>
                              聽力 <span className={s.max}>/ {session.midtermMaxScore / 2}</span>
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
                            />
                          </div>
                          <div className={f.field}>
                            <label className={s.fieldLabel}>{t("grid.retake")}</label>
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
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {session.hasFinal && (
                      <div className={s.pair}>
                        <div className={f.field}>
                          <label className={s.fieldLabel}>
                            {t("sessions.final")} <span className={s.max}>/ {session.finalMaxScore}</span>
                          </label>
                          <NumberInput
                            value={final.original}
                            max={session.finalMaxScore}
                            onCommit={(v) => setScore(row.id, { key: "FINAL", category: "FINAL", assessmentId: null }, "original", v)}
                          />
                        </div>
                        <div className={f.field}>
                          <label className={s.fieldLabel}>{t("grid.retake")}</label>
                          <NumberInput
                            value={final.retake}
                            max={session.finalMaxScore}
                            onCommit={(v) => setScore(row.id, { key: "FINAL", category: "FINAL", assessmentId: null }, "retake", v)}
                          />
                        </div>
                      </div>
                    )}

                    {session.hasFeedback && (
                      <div className={f.field}>
                        <label className={s.fieldLabel}>{t("sessions.feedback")}</label>
                        <FeedbackInput value={state.feedback} onCommit={(v) => setFeedback(row.id, v)} />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpanded(row.id)}
                      aria-expanded={isExpanded}
                      className={`${s.toggle} ${s.collapse}`}
                    >
                      <ChevronUp size={14} aria-hidden />
                      {t("sessions.tapToCollapse")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visibleEnrollments.length === 0 && (
          <div className={`${s.card} ${s.empty}`}>—</div>
        )}
      </div>

      {/* mt-auto pins this to the bottom of the (min-h-full) flex column
          even when the roster is short enough that the page doesn't
          scroll; sticky bottom-0 then keeps it on screen instead of
          scrolling away once a longer roster does need to scroll. */}
      <div className={`${s.saveBar} ${dirty ? s.dirty : ""} ${s.noPrint}`}>
        <span className={s.unsaved}>
          {dirty && !saving && (
            <>
              <span className={s.dot}>
                <span className={s.wave} />
                <span />
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
      <div className={s.print}>
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
    <div className={s.rolling}>
      {exiting && (
        <div className={`${s.line} ${s.rollOut} ${exiting.color}`}>{exiting.text}</div>
      )}
      <div className={`${s.line} ${exiting ? s.rollIn : ""} ${current.color}`}>{current.text}</div>
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
}: {
  value: string;
  max?: number;
  onCommit: (value: string) => void;
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
      className={`tabular ${s.number}`}
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
      className={`${inputClass} ${s.fieldInput} ${s.feedback} ${className}`}
    />
  );
}
