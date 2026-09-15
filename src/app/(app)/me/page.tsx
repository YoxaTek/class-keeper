import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CircleCheck, TriangleAlert, MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { cardClass } from "@/components/ui/styles";
import { FeedbackForm } from "./FeedbackForm";

export default async function MePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");

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
          sessions: term.sessions.map((s) => ({ id: s.id, hasQuiz: s.hasQuiz, hasAssignment: s.hasAssignment })),
          scores: enrollment.scores.map((s) => ({
            sessionId: s.sessionId,
            category: s.category,
            originalScore: s.originalScore,
            retakeScore: s.retakeScore,
          })),
          impressionScore: enrollment.evaluation?.impressionScore ?? null,
          settings: {
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
          },
        });

        return (
          <section key={enrollment.id} className={`${cardClass} space-y-4 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {term.subject.name} <span className="text-zinc-400 dark:text-zinc-600">·</span> {term.name}
              </h2>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  grade.passing
                    ? "bg-[#0f6e56]/10 text-[#0f6e56] dark:text-teal-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                {grade.passing ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                {grade.total.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{t("attendancePct")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">
                      {Math.round(grade.attendance.pct * 100)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightAttendance")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.attendance.score.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightAssignment")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.assignment.score.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightQuiz")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.quiz.score.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightMidterm")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.midterm.score.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightFinal")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.final.score.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">{tDashboard("weightImpression")}</td>
                    <td className="tabular py-1 text-right text-zinc-900 dark:text-zinc-100">{grade.impression.score.toFixed(1)}</td>
                  </tr>
                  <tr className="border-t border-zinc-200 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                    <td className="py-1 pr-4">{t("title")}</td>
                    <td className="tabular py-1 text-right">{grade.total.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
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
