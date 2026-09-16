import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { cardClass } from "@/components/ui/styles";
import { GradeBreakdownCard } from "@/components/GradeBreakdownCard";
import { FeedbackForm } from "./FeedbackForm";

export default async function MePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");
  const tGrade = await getTranslations("studentDetail");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      enrollments: {
        include: {
          term: { include: { subject: true, sessions: true } },
          attendance: true,
          scores: true,
          evaluation: true,
          feedback: true,
        },
        orderBy: { term: { startDate: "desc" } },
      },
    },
  });

  if (!student) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No student profile is linked to this account.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {student.enrollments.map((enrollment) => {
        const { term } = enrollment;
        const grade = calculateGrade({
          attendance: enrollment.attendance.map((a) => ({ status: a.status })),
          sessions: term.sessions.map((s) => ({
            id: s.id,
            hasQuiz: s.hasQuiz,
            quizMaxScore: s.quizMaxScore,
            hasAssignment: s.hasAssignment,
            assignmentMaxScore: s.assignmentMaxScore,
            hasMidterm: s.hasMidterm,
            midtermMaxScore: s.midtermMaxScore,
            hasFinal: s.hasFinal,
            finalMaxScore: s.finalMaxScore,
          })),
          scores: enrollment.scores.map((s) => ({
            sessionId: s.sessionId,
            category: s.category,
            originalScore: s.originalScore,
            retakeScore: s.retakeScore,
            retakeMaxScore: s.retakeMaxScore,
          })),
          impressionScore: enrollment.evaluation?.impressionScore ?? null,
          settings: {
            maxExcusedAbsences: term.maxExcusedAbsences,
            weightAttendance: term.weightAttendance,
            weightAssignment: term.weightAssignment,
            weightQuiz: term.weightQuiz,
            weightMidterm: term.weightMidterm,
            weightFinal: term.weightFinal,
            weightImpression: term.weightImpression,
            passingScore: term.passingScore,
            finalExamSessionId: term.finalExamSessionId,
          },
        });

        return (
          <section key={enrollment.id} className="space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {term.subject.name} <span className="text-zinc-400 dark:text-zinc-600">·</span> {term.name}
            </h2>

            <GradeBreakdownCard
              grade={grade}
              weights={{
                attendance: term.weightAttendance,
                assignment: term.weightAssignment,
                quiz: term.weightQuiz,
                midterm: term.weightMidterm,
                final: term.weightFinal,
                impression: term.weightImpression,
              }}
              labels={{
                title: t("title"),
                passing: tGrade("passing"),
                belowPassing: tGrade("belowPassing"),
                attendance: tDashboard("weightAttendance"),
                assignment: tDashboard("weightAssignment"),
                quiz: tDashboard("weightQuiz"),
                midterm: tDashboard("weightMidterm"),
                final: tDashboard("weightFinal"),
                impression: tDashboard("weightImpression"),
              }}
            />

            <div className={`${cardClass} space-y-1 p-4`}>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <MessageSquareText className="h-4 w-4 text-zinc-400" aria-hidden />
                {t("evaluation")}
              </h3>
              {/* Shown exactly as the teacher wrote it — never machine-translated. */}
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {enrollment.evaluation?.narrative || t("noEvaluationYet")}
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <FeedbackForm enrollmentId={enrollment.id} existing={enrollment.feedback} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
