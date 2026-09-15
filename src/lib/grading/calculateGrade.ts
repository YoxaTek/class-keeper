export type AttendanceStatus =
  | "PRESENT"
  | "EXCUSED"
  | "ABSENT"
  | "NOT_ENROLLED"
  | "ABROAD";

export type ScoreCategory =
  | "QUIZ"
  | "ASSIGNMENT"
  | "MIDTERM_READING"
  | "MIDTERM_LISTENING"
  | "FINAL";

export interface AttendanceInput {
  status: AttendanceStatus;
}

export interface ScoreInput {
  sessionId: string;
  category: ScoreCategory;
  originalScore: number | null;
  retakeScore: number | null;
}

/** A session's flags, used to know which sessions count toward each average. */
export interface SessionFlags {
  id: string;
  hasQuiz: boolean;
  hasAssignment: boolean;
}

export interface TermGradingSettings {
  maxExcusedAbsences: number;
  midtermMaxScore: number;
  weightAttendance: number;
  weightAssignment: number;
  weightQuiz: number;
  weightMidterm: number;
  weightFinal: number;
  weightImpression: number;
  passingScore: number;
  /** When set, the final exam score is that session's ASSIGNMENT score instead of a dedicated FINAL record. */
  finalExamSessionId: string | null;
}

export interface GradingInput {
  attendance: AttendanceInput[];
  sessions: SessionFlags[];
  scores: ScoreInput[];
  impressionScore: number | null;
  settings: TermGradingSettings;
}

export interface GradeBreakdown {
  attendance: { pct: number; score: number };
  assignment: { average: number; score: number };
  quiz: { average: number; score: number };
  midterm: { normalized: number; score: number };
  final: { score: number };
  impression: { score: number };
  total: number;
  passing: boolean;
}

/** retakeScore wins over originalScore when present; a missing/null score is 0. */
function effectiveScore(record: { originalScore: number | null; retakeScore: number | null } | undefined): number {
  if (!record) return 0;
  if (record.retakeScore !== null && record.retakeScore !== undefined) return record.retakeScore;
  if (record.originalScore !== null && record.originalScore !== undefined) return record.originalScore;
  return 0;
}

function calculateAttendance(
  attendance: AttendanceInput[],
  maxExcusedAbsences: number,
  weight: number
): { pct: number; score: number } {
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const excused = attendance.filter((a) => a.status === "EXCUSED").length;
  // NOT_ENROLLED and ABROAD are excluded entirely — no action needed.

  const excessExcused = Math.max(0, excused - maxExcusedAbsences);
  const effectiveAbsent = absent + excessExcused;

  const denominator = present + effectiveAbsent;
  const pct = denominator === 0 ? 0 : present / denominator;

  return { pct, score: pct * weight };
}

function calculateAssignment(
  scores: ScoreInput[],
  sessions: SessionFlags[],
  weight: number
): { average: number; score: number } {
  const assignmentSessions = sessions.filter((s) => s.hasAssignment);
  if (assignmentSessions.length === 0) return { average: 0, score: 0 };

  const byScession = new Map(
    scores
      .filter((s) => s.category === "ASSIGNMENT")
      .map((s) => [s.sessionId, s] as const)
  );

  const total = assignmentSessions.reduce(
    (sum, session) => sum + effectiveScore(byScession.get(session.id)),
    0
  );
  const average = total / assignmentSessions.length;

  return { average, score: (average / 100) * weight };
}

function calculateQuiz(
  scores: ScoreInput[],
  sessions: SessionFlags[],
  weight: number
): { average: number; score: number } {
  const quizSessions = sessions.filter((s) => s.hasQuiz);
  if (quizSessions.length === 0) return { average: 0, score: 0 };

  const byScession = new Map(
    scores.filter((s) => s.category === "QUIZ").map((s) => [s.sessionId, s] as const)
  );

  const total = quizSessions.reduce(
    (sum, session) => sum + effectiveScore(byScession.get(session.id)),
    0
  );
  const average = total / quizSessions.length;

  return { average, score: (average / 100) * weight };
}

function calculateMidterm(
  scores: ScoreInput[],
  midtermMaxScore: number,
  weight: number
): { normalized: number; score: number } {
  const reading = scores.find((s) => s.category === "MIDTERM_READING");
  const listening = scores.find((s) => s.category === "MIDTERM_LISTENING");
  const sum = effectiveScore(reading) + effectiveScore(listening);
  const normalized = midtermMaxScore === 0 ? 0 : (sum / midtermMaxScore) * 100;

  return { normalized, score: (normalized / 100) * weight };
}

function calculateFinal(
  scores: ScoreInput[],
  finalExamSessionId: string | null,
  weight: number
): { score: number } {
  let raw: number;
  if (finalExamSessionId) {
    const override = scores.find(
      (s) => s.sessionId === finalExamSessionId && s.category === "ASSIGNMENT"
    );
    raw = effectiveScore(override);
  } else {
    const dedicated = scores.find((s) => s.category === "FINAL");
    raw = effectiveScore(dedicated);
  }

  return { score: (raw / 100) * weight };
}

export function calculateGrade(input: GradingInput): GradeBreakdown {
  const { settings } = input;

  const attendance = calculateAttendance(
    input.attendance,
    settings.maxExcusedAbsences,
    settings.weightAttendance
  );
  const assignment = calculateAssignment(input.scores, input.sessions, settings.weightAssignment);
  const quiz = calculateQuiz(input.scores, input.sessions, settings.weightQuiz);
  const midterm = calculateMidterm(input.scores, settings.midtermMaxScore, settings.weightMidterm);
  const final = calculateFinal(input.scores, settings.finalExamSessionId, settings.weightFinal);
  // Evaluation.impressionScore is already scored out of weightImpression (e.g. 0-10), not out of 100.
  const impression = { score: input.impressionScore ?? 0 };

  const total =
    attendance.score + assignment.score + quiz.score + midterm.score + final.score + impression.score;

  return {
    attendance,
    assignment,
    quiz,
    midterm,
    final,
    impression,
    total,
    passing: total >= settings.passingScore,
  };
}
