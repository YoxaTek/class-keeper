"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Attendance, AttendanceStatus, Enrollment, ScoreRecord, Session, Student } from "@prisma/client";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";

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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t("grid.student")}
            </th>
            {columns.map(({ session, label }, i) => (
              <th
                key={session.id}
                colSpan={colSpan(session)}
                className={`border-b border-l border-zinc-200 px-2 py-2 text-left text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 ${
                  i % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-950"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
            {columns.map(({ session }, i) => (
              <SubHeaders key={session.id} session={session} t={t} shaded={i % 2 === 1} />
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((row, rowIndex) => {
            const state = rowState.get(row.id)!;
            return (
              <tr
                key={row.id}
                className={rowIndex % 2 === 1 ? "bg-zinc-50/60 dark:bg-zinc-900/40" : "bg-white dark:bg-zinc-950"}
              >
                <td className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-inherit px-3 py-1.5 font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                  {row.student.name}
                </td>
                {columns.map(({ session }, i) => (
                  <SessionCells
                    key={session.id}
                    session={session}
                    shaded={i % 2 === 1}
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

function SubHeaders({ session, t, shaded }: { session: Session; t: ReturnType<typeof useTranslations>; shaded: boolean }) {
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
        <th
          key={i}
          className={`border-b border-l border-zinc-200 px-2 py-1 text-[11px] font-normal text-zinc-500 dark:border-zinc-800 dark:text-zinc-500 ${
            shaded ? "bg-zinc-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-950"
          }`}
        >
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
  shaded,
  onAttendance,
  onScore,
}: {
  session: Session;
  attendance: AttendanceStatus | undefined;
  scores: Map<string, { original: string; retake: string }>;
  shaded: boolean;
  onAttendance: (status: AttendanceStatus) => void;
  onScore: (
    category: "QUIZ" | "ASSIGNMENT" | "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL",
    field: "original" | "retake",
    value: string
  ) => void;
}) {
  const t = useTranslations();
  const bg = shaded ? "bg-zinc-50/60 dark:bg-zinc-900/40" : "";
  const cells: React.ReactNode[] = [];

  if (session.hasAttendance) {
    cells.push(
      <AttendanceCell key="att" status={attendance ?? "PRESENT"} onChange={onAttendance} bg={bg} t={t} />
    );
  }

  if (session.hasQuiz) {
    const val = scores.get(scoreKey(session.id, "QUIZ")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="quiz-o" value={val.original} bg={bg} onCommit={(v) => onScore("QUIZ", "original", v)} />,
      <NumberCell key="quiz-r" value={val.retake} bg={bg} muted onCommit={(v) => onScore("QUIZ", "retake", v)} />
    );
  }

  if (session.hasAssignment) {
    const val = scores.get(scoreKey(session.id, "ASSIGNMENT")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="assign" value={val.original} bg={bg} onCommit={(v) => onScore("ASSIGNMENT", "original", v)} />
    );
  }

  if (session.hasMidterm) {
    const reading = scores.get(scoreKey(session.id, "MIDTERM_READING")) ?? { original: "", retake: "" };
    const listening = scores.get(scoreKey(session.id, "MIDTERM_LISTENING")) ?? { original: "", retake: "" };
    cells.push(
      <NumberCell key="mid-r" value={reading.original} bg={bg} onCommit={(v) => onScore("MIDTERM_READING", "original", v)} />,
      <NumberCell key="mid-l" value={listening.original} bg={bg} onCommit={(v) => onScore("MIDTERM_LISTENING", "original", v)} />
    );
  }

  if (session.hasFinal) {
    const val = scores.get(scoreKey(session.id, "FINAL")) ?? { original: "", retake: "" };
    cells.push(<NumberCell key="final" value={val.original} bg={bg} onCommit={(v) => onScore("FINAL", "original", v)} />);
  }

  if (cells.length === 0)
    cells.push(
      <td key="empty" className={`border-b border-l border-zinc-100 px-2 py-1.5 text-zinc-300 dark:border-zinc-900 dark:text-zinc-700 ${bg}`}>
        —
      </td>
    );

  return <>{cells}</>;
}

function AttendanceCell({
  status,
  onChange,
  bg,
  t,
}: {
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  bg: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const Icon = attendanceIcon[status];
  return (
    <td className={`border-b border-l border-zinc-100 px-1.5 py-1 dark:border-zinc-900 ${bg}`}>
      <div className="relative flex items-center">
        <Icon className={`pointer-events-none absolute left-1.5 h-3.5 w-3.5 ${attendanceColor[status]}`} aria-hidden />
        <select
          value={status}
          onChange={(e) => onChange(e.target.value as AttendanceStatus)}
          className="w-full cursor-pointer appearance-none rounded border border-transparent bg-transparent py-0.5 pl-6 pr-1 text-xs text-zinc-800 hover:border-zinc-200 focus:border-[#0f6e56] focus:outline-none dark:text-zinc-200 dark:hover:border-zinc-700"
        >
          {ATTENDANCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`attendanceStatus.${s}`)}
            </option>
          ))}
        </select>
      </div>
    </td>
  );
}

function NumberCell({
  value,
  onCommit,
  bg,
  muted,
}: {
  value: string;
  onCommit: (value: string) => void;
  bg: string;
  muted?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <td className={`border-b border-l border-zinc-100 px-1.5 py-1 dark:border-zinc-900 ${bg}`}>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        placeholder={muted ? "補考" : undefined}
        className={`tabular w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-xs hover:border-zinc-200 focus:border-[#0f6e56] focus:outline-none dark:hover:border-zinc-700 ${
          muted ? "text-zinc-400 placeholder:text-zinc-300 dark:text-zinc-500 dark:placeholder:text-zinc-700" : "text-zinc-900 dark:text-zinc-100"
        }`}
      />
    </td>
  );
}
