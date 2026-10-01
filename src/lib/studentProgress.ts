import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";

/**
 * Everything the "student record" screen needs for one enrollment: the
 * enrollment with its attendance/scores/evaluation/class notes, the course
 * with its sessions, and the computed grade. Shared by the teacher/TA view
 * and the student's own view so both show exactly the same record.
 *
 * Returns null when there is no such enrollment (or it belongs to another
 * course than `courseId`, when given) — callers turn that into a 404 after
 * their own access check.
 */
export async function loadStudentProgress(enrollmentId: string, courseId?: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId, ...(courseId ? { courseId } : {}) },
    include: {
      student: true,
      course: { include: { subject: true, sessions: { include: { assessments: true } } } },
      attendance: { include: { session: true }, orderBy: { session: { date: "asc" } } },
      scores: { include: { session: true }, orderBy: { session: { date: "asc" } } },
      evaluation: true,
      feedback: true, // the student's own end-of-course feedback (used by their entry page)
      sessionFeedback: { include: { session: true }, orderBy: { session: { date: "asc" } } },
    },
  });
  if (!enrollment) return null;

  const { course } = enrollment;
  const sessions = course.sessions;
  const assessments = sessions.flatMap((s) =>
    s.assessments.map((a) => ({ id: a.id, sessionId: a.sessionId, type: a.type, maxScore: a.maxScore, label: a.label }))
  );

  const grade = calculateGrade({
    attendance: enrollment.attendance.map((a) => ({ status: a.status })),
    sessions: sessions.map((s) => ({
      id: s.id,
      hasMidterm: s.hasMidterm,
      midtermMaxScore: s.midtermMaxScore,
      hasFinal: s.hasFinal,
      finalMaxScore: s.finalMaxScore,
    })),
    assessments,
    scores: enrollment.scores.map((s) => ({
      sessionId: s.sessionId,
      category: s.category,
      assessmentId: s.assessmentId,
      originalScore: s.originalScore,
      retakeScore: s.retakeScore,
      retakeMaxScore: s.retakeMaxScore,
    })),
    impressionScore: enrollment.evaluation?.impressionScore ?? null,
    settings: {
      maxExcusedAbsences: course.maxExcusedAbsences,
      weightAttendance: course.weightAttendance,
      weightAssignment: course.weightAssignment,
      weightQuiz: course.weightQuiz,
      weightMidterm: course.weightMidterm,
      weightFinal: course.weightFinal,
      weightImpression: course.weightImpression,
      passingScore: course.passingScore,
      finalExamSessionId: course.finalExamSessionId,
    },
  });

  // Whether each grade category has anything recorded at all, regardless of
  // whether it nets out to zero — see GradeBreakdownCard's `hasData` prop.
  const hasData = {
    attendance: enrollment.attendance.length > 0,
    assignment: assessments.some((a) => a.type === "ASSIGNMENT"),
    quiz: assessments.some((a) => a.type === "QUIZ"),
    midterm: sessions.some((s) => s.hasMidterm),
    final: sessions.some((s) => s.hasFinal) || !!course.finalExamSessionId,
    impression: enrollment.evaluation?.impressionScore != null,
  };

  return { enrollment, course, sessions, assessments, grade, hasData };
}

export type StudentProgress = NonNullable<Awaited<ReturnType<typeof loadStudentProgress>>>;
