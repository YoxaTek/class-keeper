import { describe, expect, it } from "vitest";
import { calculateGrade, type GradingInput, type TermGradingSettings } from "./calculateGrade";

const baseSettings: TermGradingSettings = {
  maxExcusedAbsences: 3,
  midtermMaxScore: 100,
  weightAttendance: 15,
  weightAssignment: 15,
  weightQuiz: 30,
  weightMidterm: 15,
  weightFinal: 15,
  weightImpression: 10,
  passingScore: 70,
  finalExamSessionId: null,
};

describe("calculateGrade — attendance (professor's worked example)", () => {
  // 24 total sessions. Student joined at week 3 (4 sessions before that are
  // NOT_ENROLLED). Of the 20 sessions while enrolled: 2 EXCUSED (both within
  // the default cap of 3, so excluded from the denominator entirely), 2
  // ABROAD (excluded like NOT_ENROLLED), 2 ABSENT, and the rest PRESENT (14).
  // Expected: 14 / (14 + 2) = 87.5% attendance -> 0.875 * 15 = 13.125 ~ 13.1 pts.
  const attendance = [
    ...Array(4).fill({ status: "NOT_ENROLLED" as const }),
    ...Array(14).fill({ status: "PRESENT" as const }),
    ...Array(2).fill({ status: "EXCUSED" as const }),
    ...Array(2).fill({ status: "ABROAD" as const }),
    ...Array(2).fill({ status: "ABSENT" as const }),
  ];

  it("computes 87.5% attendance", () => {
    const result = calculateGrade({
      attendance,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.attendance.pct).toBeCloseTo(0.875, 5);
  });

  it("computes 13.1/15 attendance points", () => {
    const result = calculateGrade({
      attendance,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(Math.round(result.attendance.score * 10) / 10).toBe(13.1);
  });

  it("treats excused absences beyond the cap as absent", () => {
    // Same shape, but 5 EXCUSED instead of 2 -> 2 beyond the cap of 3 count as ABSENT.
    const withExcessExcused = [
      ...Array(4).fill({ status: "NOT_ENROLLED" as const }),
      ...Array(14).fill({ status: "PRESENT" as const }),
      ...Array(5).fill({ status: "EXCUSED" as const }),
      ...Array(2).fill({ status: "ABROAD" as const }),
      ...Array(2).fill({ status: "ABSENT" as const }),
    ];

    const result = calculateGrade({
      attendance: withExcessExcused,
      sessions: [],
      scores: [],
      impressionScore: 0,
      settings: baseSettings,
    });

    // denominator = present(14) + absent(2) + excess_excused(2) = 18
    expect(result.attendance.pct).toBeCloseTo(14 / 18, 5);
  });
});

describe("calculateGrade — assignment", () => {
  const sessions = [
    { id: "s1", hasQuiz: false, hasAssignment: true },
    { id: "s2", hasQuiz: false, hasAssignment: true },
  ];

  it("averages assignment scores and treats a missing record as 0", () => {
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
});

describe("calculateGrade — quiz", () => {
  const sessions = [
    { id: "s1", hasQuiz: true, hasAssignment: false },
    { id: "s2", hasQuiz: true, hasAssignment: false },
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

describe("calculateGrade — midterm", () => {
  it("normalizes against midtermMaxScore (Intermediate = 200)", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [],
      scores: [
        { sessionId: "s1", category: "MIDTERM_READING", originalScore: 90, retakeScore: null },
        { sessionId: "s1", category: "MIDTERM_LISTENING", originalScore: 80, retakeScore: null },
      ],
      impressionScore: 0,
      settings: { ...baseSettings, midtermMaxScore: 200 },
    });

    // (90 + 80) / 200 * 100 = 85
    expect(result.midterm.normalized).toBeCloseTo(85, 5);
    expect(result.midterm.score).toBeCloseTo((85 / 100) * 15, 5);
  });
});

describe("calculateGrade — final exam", () => {
  it("uses the dedicated FINAL record when finalExamSessionId is unset", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [],
      scores: [{ sessionId: "final-session", category: "FINAL", originalScore: 88, retakeScore: null }],
      impressionScore: 0,
      settings: baseSettings,
    });

    expect(result.final.score).toBeCloseTo((88 / 100) * 15, 5);
  });

  it("uses the override session's ASSIGNMENT score when finalExamSessionId is set", () => {
    const result = calculateGrade({
      attendance: [],
      sessions: [],
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
      ...Array(14).fill({ status: "PRESENT" as const }),
      ...Array(2).fill({ status: "EXCUSED" as const }),
      ...Array(2).fill({ status: "ABROAD" as const }),
      ...Array(2).fill({ status: "ABSENT" as const }),
    ],
    sessions: [
      { id: "a1", hasQuiz: false, hasAssignment: true },
      { id: "q1", hasQuiz: true, hasAssignment: false },
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

  it("sums all six categories and flags passing against the term's threshold", () => {
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

  it("flags a low-scoring enrollment as below the term's passing threshold", () => {
    const failing = calculateGrade({
      ...input,
      scores: [],
      impressionScore: 0,
      attendance: Array(24).fill({ status: "ABSENT" as const }),
    });

    expect(failing.passing).toBe(false);
  });
});
