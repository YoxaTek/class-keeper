export type AttendanceStatus =
  | "PRESENT"
  | "EXCUSED"
  | "ABSENT"
  | "NOT_ENROLLED";

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
  /** The retake's own total possible points — can differ from the category's session-level total. Defaults to that session total when unset. */
  retakeMaxScore?: number | null;
}

/**
 * A session's flags, used to know which sessions count toward each average.
 * Each *MaxScore is that category's total possible points for this specific
 * class — set per class rather than assumed to be 100 (or, for midterm,
 * assumed term-wide), since a quiz, assignment, midterm, or final can be
 * worth a different number of points from one class to the next.
 */
export interface SessionFlags {
  id: string;
  hasQuiz: boolean;
  quizMaxScore?: number;
  hasAssignment: boolean;
  assignmentMaxScore?: number;
  hasMidterm: boolean;
  /** Combined reading + listening total for this class's midterm. */
  midtermMaxScore?: number;
  hasFinal: boolean;
  finalMaxScore?: number;
}

export interface TermGradingSettings {
  maxExcusedAbsences: number;
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

/**
 * The class's total possible points for one score category — half of
 * midtermMaxScore for each of reading/listening, since that field is the
 * combined total.
 */
export function categorySessionMax(session: SessionFlags, category: ScoreCategory): number {
  switch (category) {
    case "QUIZ":
      return session.quizMaxScore ?? 100;
    case "ASSIGNMENT":
      return session.assignmentMaxScore ?? 100;
    case "MIDTERM_READING":
    case "MIDTERM_LISTENING":
      return (session.midtermMaxScore ?? 100) / 2;
    case "FINAL":
      return session.finalMaxScore ?? 100;
  }
}

/**
 * Normalizes one record to a 0-100 percentage against `sessionMax` — the
 * class's total for that category. A retake, when present, is normalized
 * against its own total instead (falling back to the session's when the
 * retake didn't set one), since a retake can be worth a different number of
 * points than the original.
 */
export function pctFor(
  record: Pick<ScoreInput, "originalScore" | "retakeScore" | "retakeMaxScore"> | undefined,
  sessionMax: number
): number {
  const usingRetake = record?.retakeScore !== null && record?.retakeScore !== undefined;
  const obtained = usingRetake ? record!.retakeScore! : (record?.originalScore ?? 0);
  const max = usingRetake ? (record?.retakeMaxScore ?? sessionMax) : sessionMax;
  return max > 0 ? (obtained / max) * 100 : 0;
}

function calculateAttendance(
  attendance: AttendanceInput[],
  maxExcusedAbsences: number,
  weight: number
): { pct: number; score: number } {
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const excused = attendance.filter((a) => a.status === "EXCUSED").length;
  // NOT_ENROLLED is excluded entirely — no action needed.

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
    scores.filter((s) => s.category === "ASSIGNMENT").map((s) => [s.sessionId, s] as const)
  );

  const percentages = assignmentSessions.map((session) =>
    pctFor(byScession.get(session.id), session.assignmentMaxScore ?? 100)
  );
  const average = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;

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

  const percentages = quizSessions.map((session) => pctFor(byScession.get(session.id), session.quizMaxScore ?? 100));
  const average = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;

  return { average, score: (average / 100) * weight };
}

function calculateMidterm(
  scores: ScoreInput[],
  sessions: SessionFlags[],
  weight: number
): { normalized: number; score: number } {
  const midtermSessions = sessions.filter((s) => s.hasMidterm);
  if (midtermSessions.length === 0) return { normalized: 0, score: 0 };

  const reading = scores.find((s) => s.category === "MIDTERM_READING");
  const listening = scores.find((s) => s.category === "MIDTERM_LISTENING");

  // Reading and listening are two records within the same midterm class;
  // find whichever session actually hosts each one, falling back to the
  // first midterm-flagged session (matches the historical, un-scoped
  // lookup, for a term with more than one midterm-flagged class).
  const readingSession = midtermSessions.find((s) => s.id === reading?.sessionId) ?? midtermSessions[0];
  const listeningSession = midtermSessions.find((s) => s.id === listening?.sessionId) ?? midtermSessions[0];

  // The class's midtermMaxScore is reading + listening combined, so each
  // half contributes half of it — same math as the old sum/total*100 when
  // both use their original score; diverges only when a retake brings in
  // its own total for just one half.
  const readingPct = pctFor(reading, (readingSession.midtermMaxScore ?? 100) / 2);
  const listeningPct = pctFor(listening, (listeningSession.midtermMaxScore ?? 100) / 2);
  const normalized = (readingPct + listeningPct) / 2;

  return { normalized, score: (normalized / 100) * weight };
}

function calculateFinal(
  scores: ScoreInput[],
  sessions: SessionFlags[],
  finalExamSessionId: string | null,
  weight: number
): { score: number } {
  let record: ScoreInput | undefined;
  let max = 100;

  if (finalExamSessionId) {
    // The override reuses that session's ASSIGNMENT record, so its total
    // is that session's assignmentMaxScore, not a dedicated final total.
    record = scores.find((s) => s.sessionId === finalExamSessionId && s.category === "ASSIGNMENT");
    const session = sessions.find((s) => s.id === finalExamSessionId);
    max = session?.assignmentMaxScore ?? 100;
  } else {
    record = scores.find((s) => s.category === "FINAL");
    const session = sessions.find((s) => s.id === record?.sessionId);
    max = session?.finalMaxScore ?? 100;
  }

  return { score: (pctFor(record, max) / 100) * weight };
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
  const midterm = calculateMidterm(input.scores, input.sessions, settings.weightMidterm);
  const final = calculateFinal(input.scores, input.sessions, settings.finalExamSessionId, settings.weightFinal);
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
