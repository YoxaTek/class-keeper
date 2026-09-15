"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Attendance, AttendanceStatus, Enrollment, ScoreRecord, Session, Student } from "@prisma/client";

type Row = Enrollment & { student: Student; attendance: Attendance[]; scores: ScoreRecord[] };

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["PRESENT", "EXCUSED", "ABSENT", "ABROAD", "NOT_ENROLLED"];

function scoreKey(sessionId: string, category: string) {
  return `${sessionId}:${category}`;
}

export function SessionGrid({ enrollments, sessions }: { enrollments: Row[]; sessions: Session[] }) {
  const t = useTranslations();

  // rowState[enrollmentId] holds live-edited values, seeded from server data
  // and mutated in place (see forceRender below) rather than replaced —
  // there's no setter to keep the state itself effectively read-only.
  const [rowState] = useState(() => {
    const state = new Map<
      string,
      { attendance: Map<string, AttendanceStatus>; scores: Map<string, { original: string; retake: string }> }
    >();
    for (const row of enrollments) {
      const attendance = new Map<string, AttendanceStatus>();
      for (const a of row.attendance) attendance.set(a.sessionId, a.status);

      const scores = new Map<string, { original: string; retake: string }>();
      for (const s of row.scores) {
        scores.set(scoreKey(s.sessionId, s.category), {
          original: s.originalScore?.toString() ?? "",
          retake: s.retakeScore?.toString() ?? "",
        });
      }
      state.set(row.id, { attendance, scores });
    }
    return state;
  });

  const [, forceRender] = useState(0);

  async function setAttendance(enrollmentId: string, sessionId: string, status: AttendanceStatus) {
    rowState.get(enrollmentId)?.attendance.set(sessionId, status);
    forceRender((n) => n + 1);
    await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, enrollmentId, status }),
    });
  }

  async function setScore(
    enrollmentId: string,
    sessionId: string,
    category: "QUIZ" | "ASSIGNMENT" | "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL",
    field: "original" | "retake",
    rawValue: string
  ) {
    const row = rowState.get(enrollmentId);
    if (!row) return;
    const key = scoreKey(sessionId, category);
    const current = row.scores.get(key) ?? { original: "", retake: "" };
    const next = { ...current, [field]: rawValue };
    row.scores.set(key, next);
    forceRender((n) => n + 1);

    await fetch("/api/scores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        enrollmentId,
        category,
        originalScore: next.original === "" ? null : Number(next.original),
        retakeScore: next.retake === "" ? null : Number(next.retake),
      }),
    });
  }

  const columns = useMemo(
    () =>
      sessions.map((s) => ({
        session: s,
        label: s.label ?? new Date(s.date).toLocaleDateString(),
      })),
    [sessions]
  );

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-r border-black/10 bg-white px-2 py-2 text-left dark:border-white/10 dark:bg-black">
              {t("grid.student")}
            </th>
            {columns.map(({ session, label }) => (
              <th key={session.id} colSpan={colSpan(session)} className="border-b border-black/10 px-2 py-2 text-left dark:border-white/10">
                {label}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 border-r border-black/10 bg-white dark:bg-black" />
            {columns.map(({ session }) => (
              <SubHeaders key={session.id} session={session} t={t} />
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((row) => {
            const state = rowState.get(row.id)!;
            return (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                <td className="sticky left-0 z-10 border-r border-black/10 bg-white px-2 py-1 font-medium dark:border-white/10 dark:bg-black">
                  {row.student.name}
                </td>
                {columns.map(({ session }) => (
                  <SessionCells
                    key={session.id}
                    session={session}
                    attendance={state.attendance.get(session.id)}
                    scores={state.scores}
                    onAttendance={(status) => setAttendance(row.id, session.id, status)}
                    onScore={(category, field, value) => setScore(row.id, session.id, category, field, value)}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function colSpan(session: Session) {
  let n = 0;
  if (session.hasAttendance) n += 1;
  if (session.hasQuiz) n += 2; // original + retake
  if (session.hasAssignment) n += 1;
  if (session.hasMidterm) n += 2; // reading + listening
  if (session.hasFinal) n += 1;
  return Math.max(n, 1);
}

function SubHeaders({ session, t }: { session: Session; t: ReturnType<typeof useTranslations> }) {
  const headers: string[] = [];
  if (session.hasAttendance) headers.push(t("sessions.attendance"));
  if (session.hasQuiz) headers.push(t("sessions.quiz"), t("grid.retake"));
  if (session.hasAssignment) headers.push(t("sessions.assignment"));
  if (session.hasMidterm) headers.push("閱讀", "聽力");
  if (session.hasFinal) headers.push(t("sessions.final"));
  if (headers.length === 0) headers.push("—");

  return (
    <>
      {headers.map((h, i) => (
        <th key={i} className="border-b border-black/10 px-2 py-1 text-xs font-normal text-black/60 dark:border-white/10 dark:text-white/60">
          {h}
        </th>
      ))}
    </>
  );
}

function SessionCells({
  session,
  attendance,
  scores,
  onAttendance,
  onScore,
}: {
  session: Session;
  attendance: AttendanceStatus | undefined;
  scores: Map<string, { original: string; retake: string }>;
  onAttendance: (status: AttendanceStatus) => void;
  onScore: (
    category: "QUIZ" | "ASSIGNMENT" | "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL",
    field: "original" | "retake",
    value: string
  ) => void;
}) {
  const t = useTranslations();
  const cells: React.ReactNode[] = [];

  if (session.hasAttendance) {
    cells.push(
      <td key="att" className="px-1 py-1">
        <select
          value={attendance ?? "PRESENT"}
          onChange={(e) => onAttendance(e.target.value as AttendanceStatus)}
          className="rounded border border-black/10 bg-transparent px-1 py-0.5 text-xs dark:border-white/20"
        >
          {ATTENDANCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`attendanceStatus.${s}`)}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (session.hasQuiz) {
    const val = scores.get(scoreKey(session.id, "QUIZ")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="quiz-o" value={val.original} onCommit={(v) => onScore("QUIZ", "original", v)} />,
      <NumberCell key="quiz-r" value={val.retake} onCommit={(v) => onScore("QUIZ", "retake", v)} />
    );
  }

  if (session.hasAssignment) {
    const val = scores.get(scoreKey(session.id, "ASSIGNMENT")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="assign" value={val.original} onCommit={(v) => onScore("ASSIGNMENT", "original", v)} />
    );
  }

  if (session.hasMidterm) {
    const reading = scores.get(scoreKey(session.id, "MIDTERM_READING")) ?? { original: "", retake: "" };
    const listening = scores.get(scoreKey(session.id, "MIDTERM_LISTENING")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="mid-r" value={reading.original} onCommit={(v) => onScore("MIDTERM_READING", "original", v)} />,
      <NumberCell key="mid-l" value={listening.original} onCommit={(v) => onScore("MIDTERM_LISTENING", "original", v)} />
    );
  }

  if (session.hasFinal) {
    const val = scores.get(scoreKey(session.id, "FINAL")) ?? { original: "", retake: "" };
    cells.push(<NumberCell key="final" value={val.original} onCommit={(v) => onScore("FINAL", "original", v)} />);
  }

  if (cells.length === 0) cells.push(<td key="empty" className="px-2 py-1 text-black/30">—</td>);

  return <>{cells}</>;
}

function NumberCell({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  return (
    <td className="px-1 py-1">
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        className="w-16 rounded border border-black/10 bg-transparent px-1 py-0.5 text-xs dark:border-white/20"
      />
    </td>
  );
}
