import { describe, expect, it } from "vitest";
import { calculateGrade, type GradingInput, type CourseGradingSettings } from "./calculateGrade";

const baseSettings: CourseGradingSettings = {
  maxExcusedAbsences: 3,
  weightAttendance: 15,
  weightAssignment: 15,
  weightQuiz: 30,
  weightMidterm: 15,
  weightFinal: 15,
  weightImpression: 10,
  passingScore: 70,
  finalExamSessionId: null,
};

const noFlags = { hasQuiz: false, hasAssignment: false, hasMidterm: false, hasFinal: false };

describe("calculateGrade — attendance (professor's worked example)", () => {
  // 24 total sessions. Student joined at week 3 (4 sessions before that are
  // NOT_ENROLLED). Of the 20 sessions while enrolled: 2 EXCUSED (both within
  // the default cap of 3, so excluded from the denominator entirely), 2
  // ABSENT, and the rest PRESENT (16).
  // Expected: 16 / (16 + 2) = 88.9% attendance.
  const attendance = [
    ...Array(4).fill({ status: "NOT_ENROLLED" as const }),
    ...Array(16).fill({ status: "PRESENT" as const }),
    ...Array(2).fill({ status: "EXCUSED" as const }),
    ...Array(2).fill({ status: "ABSENT" as const }),
  ];

  it("computes attendance percentage", () => {
    const result = calculateGrade({
      attendance,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.attendance.pct).toBeCloseTo(16 / 18, 5);
  });

  it("computes the weighted attendance points", () => {
    const result = calculateGrade({
      attendance,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.attendance.score).toBeCloseTo((16 / 18) * 15, 5);
  });

  it("treats excused absences beyond the cap as absent", () => {
    // Same shape, but 5 EXCUSED instead of 2 -> 2 beyond the cap of 3 count as ABSENT.
    const withExcessExcused = [
      ...Array(4).fill({ status: "NOT_ENROLLED" as const }),
      ...Array(16).fill({ status: "PRESENT" as const }),
      ...Array(5).fill({ status: "EXCUSED" as const }),
      ...Array(2).fill({ status: "ABSENT" as const }),
    ];

    const result = calculateGrade({
      attendance: withExcessExcused,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    // denominator = present(16) + absent(2) + excess_excused(2) = 20
    expect(result.attendance.pct).toBeCloseTo(16 / 20, 5);
  });
});

describe("calculateGrade — assignment", () => {
  const sessions = [
    { id: "s1", ...noFlags, hasAssignment: true },
    { id: "s2", ...noFlags, hasAssignment: true },
  ];

  it("averages assignment scores (out of 100 by default) and treats a missing record as 0", () => {
    const result = calculateGrade({
      attendance: [],
      sessions,
      scores: [{ sessionId: "s1", category: "ASSIGNMENT", originalScore: 80, retakeScore: null }],
      impressionScore: 0,
      settings: baseSettings,
    });

    // s1 = 80, s2 = missing -> 0. Average = 40.
    expect(result.assignment.average).toBeCloseTo(40, 5);
    expect(result.assignment.score).toBeCloseTo((40 / 100) * 15, 5);
  });

  it("normalizes against each class's own assignment total", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [
        { id: "s1", ...noFlags, hasAssignment: true, assignmentMaxScore: 20 },
        { id: "s2", ...noFlags, hasAssignment: true, assignmentMaxScore: 10 },
      ],
      // s1: 16/20 = 80%. s2: 8/10 = 80%. Average = 80%.
      scores: [
        { sessionId: "s1", category: "ASSIGNMENT", originalScore: 16, retakeScore: null },
        { sessionId: "s2", category: "ASSIGNMENT", originalScore: 8, retakeScore: null },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.assignment.average).toBeCloseTo(80, 5);
  });

  it("normalizes an assignment retake against its own total", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "s1", ...noFlags, hasAssignment: true, assignmentMaxScore: 20 }],
      // retake 9/12 = 75%, not the session's 20.
      scores: [{ sessionId: "s1", category: "ASSIGNMENT", originalScore: 5, retakeScore: 9, retakeMaxScore: 12 }],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.assignment.average).toBeCloseTo(75, 5);
  });
});

describe("calculateGrade — quiz", () => {
  const sessions = [
    { id: "s1", ...noFlags, hasQuiz: true },
    { id: "s2", ...noFlags, hasQuiz: true },
  ];

  it("uses the retake score over the original when present", () => {
    const result = calculateGrade({
      attendance: [],
      sessions,
      scores: [
        { sessionId: "s1", category: "QUIZ", originalScore: 50, retakeScore: 90 },
        { sessionId: "s2", category: "QUIZ", originalScore: 70, retakeScore: null },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    // (90 + 70) / 2 = 80
    expect(result.quiz.average).toBeCloseTo(80, 5);
    expect(result.quiz.score).toBeCloseTo((80 / 100) * 30, 5);
  });
});

describe("calculateGrade — quiz with a per-session total and a per-student retake total", () => {
  const sessions = [
    { id: "s1", ...noFlags, hasQuiz: true, quizMaxScore: 10 },
    { id: "s2", ...noFlags, hasQuiz: true, quizMaxScore: 20 },
  ];

  it("normalizes the main quiz score against the session's own total", () => {
    const result = calculateGrade({
      attendance: [],
      sessions,
      // s1: 8/10 = 80%. s2: 15/20 = 75%. Average = 77.5%.
      scores: [
        { sessionId: "s1", category: "QUIZ", originalScore: 8, retakeScore: null },
        { sessionId: "s2", category: "QUIZ", originalScore: 15, retakeScore: null },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.quiz.average).toBeCloseTo(77.5, 5);
  });

  it("normalizes a retake against its own total instead of the session's", () => {
    const result = calculateGrade({
      attendance: [],
      sessions,
      // s1 retake: 9/12 = 75% (its own total, not the session's 10).
      // s2: no retake, uses original 15/20 = 75%.
      scores: [
        { sessionId: "s1", category: "QUIZ", originalScore: 5, retakeScore: 9, retakeMaxScore: 12 },
        { sessionId: "s2", category: "QUIZ", originalScore: 15, retakeScore: null },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.quiz.average).toBeCloseTo(75, 5);
  });

  it("falls back to the session's total when a retake omits its own", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "s1", ...noFlags, hasQuiz: true, quizMaxScore: 10 }],
      // retake 9, no retakeMaxScore given -> falls back to session total of 10 -> 90%.
      scores: [{ sessionId: "s1", category: "QUIZ", originalScore: 5, retakeScore: 9 }],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.quiz.average).toBeCloseTo(90, 5);
  });
});

describe("calculateGrade — midterm", () => {
  it("normalizes reading + listening against the class's own combined total (Intermediate = 200)", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "s1", ...noFlags, hasMidterm: true, midtermMaxScore: 200 }],
      scores: [
        { sessionId: "s1", category: "MIDTERM_READING", originalScore: 90, retakeScore: null },
        { sessionId: "s1", category: "MIDTERM_LISTENING", originalScore: 80, retakeScore: null },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    // (90 + 80) / 200 * 100 = 85
    expect(result.midterm.normalized).toBeCloseTo(85, 5);
    expect(result.midterm.score).toBeCloseTo((85 / 100) * 15, 5);
  });

  it("normalizes a listening retake against its own total independently of reading", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "s1", ...noFlags, hasMidterm: true, midtermMaxScore: 200 }],
      // reading: 90/100 = 90%. listening retake: 40/50 = 80% (its own total, not the session's half of 100).
      // normalized = (90 + 80) / 2 = 85.
      scores: [
        { sessionId: "s1", category: "MIDTERM_READING", originalScore: 90, retakeScore: null },
        { sessionId: "s1", category: "MIDTERM_LISTENING", originalScore: 30, retakeScore: 40, retakeMaxScore: 50 },
      ],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.midterm.normalized).toBeCloseTo(85, 5);
  });
});

describe("calculateGrade — final exam", () => {
  it("uses the dedicated FINAL record, normalized against that class's total", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "final-session", ...noFlags, hasFinal: true, finalMaxScore: 100 }],
      scores: [{ sessionId: "final-session", category: "FINAL", originalScore: 88, retakeScore: null }],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.final.score).toBeCloseTo((88 / 100) * 15, 5);
  });

  it("uses the override session's ASSIGNMENT score, normalized against that class's assignment total", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [{ id: "project-session", ...noFlags, hasAssignment: true, assignmentMaxScore: 100 }],
      scores: [
        { sessionId: "project-session", category: "ASSIGNMENT", originalScore: 95, retakeScore: null },
        { sessionId: "elsewhere", category: "FINAL", originalScore: 10, retakeScore: null },
      ],
      impressionScore: 0,
      settings: { ...baseSettings, finalExamSessionId: "project-session" },
    });

    expect(result.final.score).toBeCloseTo((95 / 100) * 15, 5);
  });
});

describe("calculateGrade — total and passing threshold", () => {
  const input: GradingInput = {
    attendance: [
      ...Array(4).fill({ status: "NOT_ENROLLED" as const }),
      ...Array(16).fill({ status: "PRESENT" as const }),
      ...Array(2).fill({ status: "EXCUSED" as const }),
      ...Array(2).fill({ status: "ABSENT" as const }),
    ],
    sessions: [
      { id: "a1", ...noFlags, hasAssignment: true },
      { id: "q1", ...noFlags, hasQuiz: true },
      { id: "mid", ...noFlags, hasMidterm: true },
      { id: "final", ...noFlags, hasFinal: true },
    ],
    scores: [
      { sessionId: "a1", category: "ASSIGNMENT", originalScore: 90, retakeScore: null },
      { sessionId: "q1", category: "QUIZ", originalScore: 85, retakeScore: null },
      { sessionId: "mid", category: "MIDTERM_READING", originalScore: 45, retakeScore: null },
      { sessionId: "mid", category: "MIDTERM_LISTENING", originalScore: 40, retakeScore: null },
      { sessionId: "final", category: "FINAL", originalScore: 88, retakeScore: null },
    ],
    impressionScore: 9,
    settings: baseSettings,
  };

  it("sums all six categories and flags passing against the course's threshold", () => {
    const result = calculateGrade(input);
    const expectedTotal =
      result.attendance.score +
      result.assignment.score +
      result.quiz.score +
      result.midterm.score +
      result.final.score +
      result.impression.score;

    expect(result.total).toBeCloseTo(expectedTotal, 10);
    expect(result.passing).toBe(result.total >= baseSettings.passingScore);
  });

  it("flags a low-scoring enrollment as below the course's passing threshold", () => {
    const failing = calculateGrade({
      ...input,
      scores: [],
      impressionScore: 0,
      attendance: Array(24).fill({ status: "ABSENT" as const }),
    });

    expect(failing.passing).toBe(false);
  });
});
