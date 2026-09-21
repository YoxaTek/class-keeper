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

export type AssessmentType = "QUIZ" | "ASSIGNMENT";

export interface AttendanceInput {
  status: AttendanceStatus;
}

/**
 * One quiz or assignment instance within a session — a session can have any
 * number of these per type (e.g. 2 quizzes in one class), each with its own
 * total. Quiz/assignment averaging works over this flat, course-wide list
 * instead of one-per-session the way midterm/final still do.
 */
export interface AssessmentInput {
  id: string;
  sessionId: string;
  type: AssessmentType;
  maxScore: number;
}

export interface ScoreInput {
  sessionId: string;
  category: ScoreCategory;
  /** Which Assessment this score belongs to — set for QUIZ/ASSIGNMENT, null for MIDTERM_READING/MIDTERM_LISTENING/FINAL (still exactly one per session). */
  assessmentId?: string | null;
  originalScore: number | null;
  retakeScore: number | null;
  /** The retake's own total possible points — can differ from the category's session-level total. Defaults to that session total when unset. */
  retakeMaxScore?: number | null;
}

/**
 * A session's flags, used to know which sessions count toward each average.
 * Quiz/assignment no longer live here — see AssessmentInput — since a
 * session can have more than one of each. Midterm/final stay here since
 * each is still exactly one per session.
 */
export interface SessionFlags {
  id: string;
  hasMidterm: boolean;
  /** Combined reading + listening total for this class's midterm. */
  midtermMaxScore?: number;
  hasFinal: boolean;
  finalMaxScore?: number;
}

export interface CourseGradingSettings {
  maxExcusedAbsences: number;
  weightAttendance: number;
  weightAssignment: number;
  weightQuiz: number;
  weightMidterm: number;
  weightFinal: number;
  weightImpression: number;
  passingScore: number;
  /** When set, the final exam score is that session's (first) ASSIGNMENT assessment instead of a dedicated FINAL record. */
  finalExamSessionId: string | null;
}

export interface GradingInput {
  attendance: AttendanceInput[];
  sessions: SessionFlags[];
  assessments: AssessmentInput[];
  scores: ScoreInput[];
  impressionScore: number | null;
  settings: CourseGradingSettings;
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
 * The class's total possible points for a session-level score category
 * (MIDTERM_READING/MIDTERM_LISTENING/FINAL) — half of midtermMaxScore for
 * each of reading/listening, since that field is the combined total. QUIZ/
 * ASSIGNMENT aren't session-level any more (see AssessmentInput.maxScore).
 */
export function categorySessionMax(
  session: Pick<SessionFlags, "midtermMaxScore" | "finalMaxScore">,
  category: "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL"
): number {
  switch (category) {
    case "MIDTERM_READING":
    case "MIDTERM_LISTENING":
      return (session.midtermMaxScore ?? 100) / 2;
    case "FINAL":
      return session.finalMaxScore ?? 100;
  }
}

/**
 * A score record's total possible points regardless of category — looks up
 * the owning Assessment for QUIZ/ASSIGNMENT, falls back to
 * categorySessionMax for the session-level categories.
 */
export function scoreRecordMax(
  record: Pick<ScoreInput, "category" | "assessmentId">,
  session: Pick<SessionFlags, "midtermMaxScore" | "finalMaxScore">,
  assessmentsById: Map<string, Pick<AssessmentInput, "maxScore">>
): number {
  if (record.assessmentId) return assessmentsById.get(record.assessmentId)?.maxScore ?? 100;
  if (record.category === "MIDTERM_READING" || record.category === "MIDTERM_LISTENING" || record.category === "FINAL") {
    return categorySessionMax(session, record.category);
  }
  return 100;
}

/**
 * Normalizes one record to a 0-100 percentage against `max` — the
 * assessment's or class's total for that category. A retake, when present,
 * is normalized against its own total instead (falling back to `max` when
 * the retake didn't set one), since a retake can be worth a different
 * number of points than the original.
 */
export function pctFor(
  record: Pick<ScoreInput, "originalScore" | "retakeScore" | "retakeMaxScore"> | undefined,
  max: number
): number {
  const usingRetake = record?.retakeScore !== null && record?.retakeScore !== undefined;
  const obtained = usingRetake ? record!.retakeScore! : (record?.originalScore ?? 0);
  const effectiveMax = usingRetake ? (record?.retakeMaxScore ?? max) : max;
  return effectiveMax > 0 ? (obtained / effectiveMax) * 100 : 0;
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

/**
 * Shared by quiz and assignment: average one percentage per assessment of
 * `type`, treating a missing score as 0 — same convention as the old
 * one-per-session average, just over assessments instead of sessions.
 */
function calculateAssessmentAverage(
  scores: ScoreInput[],
  assessments: AssessmentInput[],
  type: AssessmentType,
  weight: number
): { average: number; score: number } {
  const matching = assessments.filter((a) => a.type === type);
  if (matching.length === 0) return { average: 0, score: 0 };

  const byAssessment = new Map(
    scores.filter((s): s is ScoreInput & { assessmentId: string } => !!s.assessmentId).map((s) => [s.assessmentId, s] as const)
  );

  const percentages = matching.map((a) => pctFor(byAssessment.get(a.id), a.maxScore));
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
  // lookup, for a course with more than one midterm-flagged class).
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
  assessments: AssessmentInput[],
  sessions: SessionFlags[],
  finalExamSessionId: string | null,
  weight: number
): { score: number } {
  let record: ScoreInput | undefined;
  let max = 100;

  if (finalExamSessionId) {
    // The override reuses that session's (first) ASSIGNMENT assessment, so
    // its total is that assessment's maxScore, not a dedicated final total.
    const overrideAssessment = assessments.find((a) => a.sessionId === finalExamSessionId && a.type === "ASSIGNMENT");
    record = overrideAssessment ? scores.find((s) => s.assessmentId === overrideAssessment.id) : undefined;
    max = overrideAssessment?.maxScore ?? 100;
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
  const assignment = calculateAssessmentAverage(input.scores, input.assessments, "ASSIGNMENT", settings.weightAssignment);
  const quiz = calculateAssessmentAverage(input.scores, input.assessments, "QUIZ", settings.weightQuiz);
  const midterm = calculateMidterm(input.scores, input.sessions, settings.weightMidterm);
  const final = calculateFinal(
    input.scores,
    input.assessments,
    input.sessions,
    settings.finalExamSessionId,
    settings.weightFinal
  );
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
