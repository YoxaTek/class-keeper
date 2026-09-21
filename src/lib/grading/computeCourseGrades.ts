import { prisma } from "@/lib/prisma";
import { calculateGrade, type GradeBreakdown } from "./calculateGrade";

export async function computeGradesForCourse(courseId: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  const sessions = await prisma.session.findMany({ where: { courseId }, include: { assessments: true } });
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { student: true, attendance: true, scores: true, evaluation: true },
  });

  const assessments = sessions.flatMap((s) =>
    s.assessments.map((a) => ({ id: a.id, sessionId: a.sessionId, type: a.type, maxScore: a.maxScore }))
  );

  const settings = {
    maxExcusedAbsences: course.maxExcusedAbsences,
    weightAttendance: course.weightAttendance,
    weightAssignment: course.weightAssignment,
    weightQuiz: course.weightQuiz,
    weightMidterm: course.weightMidterm,
    weightFinal: course.weightFinal,
    weightImpression: course.weightImpression,
    passingScore: course.passingScore,
    finalExamSessionId: course.finalExamSessionId,
  };

  const results = enrollments.map((enrollment) => {
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
      settings,
    });
    return { enrollment, grade };
  });

  return { course, results };
}

export type CourseGradeResult = { enrollment: Awaited<ReturnType<typeof computeGradesForCourse>>["results"][number]["enrollment"]; grade: GradeBreakdown };
