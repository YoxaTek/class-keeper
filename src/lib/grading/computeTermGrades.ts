import { prisma } from "@/lib/prisma";
import { calculateGrade, type GradeBreakdown } from "./calculateGrade";

export async function computeGradesForTerm(termId: string) {
  const term = await prisma.term.findUniqueOrThrow({ where: { id: termId } });
  const sessions = await prisma.session.findMany({ where: { termId } });
  const enrollments = await prisma.enrollment.findMany({
    where: { termId },
    include: { student: true, attendance: true, scores: true, evaluation: true },
  });

  const settings = {
    maxExcusedAbsences: term.maxExcusedAbsences,
    midtermMaxScore: term.midtermMaxScore,
    weightAttendance: term.weightAttendance,
    weightAssignment: term.weightAssignment,
    weightQuiz: term.weightQuiz,
    weightMidterm: term.weightMidterm,
    weightFinal: term.weightFinal,
    weightImpression: term.weightImpression,
    passingScore: term.passingScore,
    finalExamSessionId: term.finalExamSessionId,
  };

  const results = enrollments.map((enrollment) => {
    const grade = calculateGrade({
      attendance: enrollment.attendance.map((a) => ({ status: a.status })),
      sessions: sessions.map((s) => ({ id: s.id, hasQuiz: s.hasQuiz, hasAssignment: s.hasAssignment })),
      scores: enrollment.scores.map((s) => ({
        sessionId: s.sessionId,
        category: s.category,
        originalScore: s.originalScore,
        retakeScore: s.retakeScore,
      })),
      impressionScore: enrollment.evaluation?.impressionScore ?? null,
      settings,
    });
    return { enrollment, grade };
  });

  return { term, results };
}

export type TermGradeResult = { enrollment: Awaited<ReturnType<typeof computeGradesForTerm>>["results"][number]["enrollment"]; grade: GradeBreakdown };
