import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
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
    return <p className="text-sm text-black/60 dark:text-white/60">No student profile is linked to this account.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
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
          <section key={enrollment.id} className="space-y-4 rounded border border-black/10 p-4 dark:border-white/10">
            <h2 className="text-lg font-medium">
              {term.subject.name} · {term.name}
            </h2>

            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4">{t("attendancePct")}</td>
                  <td className="py-1">{Math.round(grade.attendance.pct * 100)}%</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightAttendance")}</td>
                  <td className="py-1">{grade.attendance.score.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightAssignment")}</td>
                  <td className="py-1">{grade.assignment.score.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightQuiz")}</td>
                  <td className="py-1">{grade.quiz.score.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightMidterm")}</td>
                  <td className="py-1">{grade.midterm.score.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightFinal")}</td>
                  <td className="py-1">{grade.final.score.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">{tDashboard("weightImpression")}</td>
                  <td className="py-1">{grade.impression.score.toFixed(1)}</td>
                </tr>
                <tr className="border-t border-black/10 font-medium dark:border-white/10">
                  <td className="py-1 pr-4">{t("title")}</td>
                  <td className="py-1">{grade.total.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>

            <div className="space-y-1">
              <h3 className="text-sm font-medium">{t("evaluation")}</h3>
              {/* Shown exactly as the teacher wrote it — never machine-translated. */}
              <p className="whitespace-pre-wrap text-sm">
                {enrollment.evaluation?.narrative || t("noEvaluationYet")}
              </p>
            </div>

            <FeedbackForm enrollmentId={enrollment.id} existing={enrollment.feedback} />
          </section>
        );
      })}
    </div>
  );
}
