import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";
import { cardClass } from "@/components/ui/styles";
import { GradeBreakdownCard } from "@/components/GradeBreakdownCard";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EvaluationForm } from "./EvaluationForm";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; enrollmentId: string }>;
}) {
  const { courseId, enrollmentId } = await params;
  const { course } = await requireCourseAccess(courseId);
  const t = await getTranslations("studentDetail");
  const tStatus = await getTranslations("attendanceStatus");
  const tDashboard = await getTranslations("dashboard");
  const tRoster = await getTranslations("roster");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  const [enrollment, sessions] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { id: enrollmentId, courseId },
      include: {
        student: true,
        attendance: { include: { session: true }, orderBy: { session: { date: "asc" } } },
        scores: { include: { session: true }, orderBy: { session: { date: "asc" } } },
        evaluation: true,
      },
    }),
    prisma.session.findMany({ where: { courseId }, include: { assessments: true } }),
  ]);
  if (!enrollment) notFound();

  const assessments = sessions.flatMap((s) =>
    s.assessments.map((a) => ({ id: a.id, sessionId: a.sessionId, type: a.type, maxScore: a.maxScore }))
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

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tRoster("title"), href: `/courses/${courseId}/roster` },
          { label: enrollment.student.name },
        ]}
      />
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {enrollment.student.name}
        {enrollment.student.chineseName && (
          <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-500">{enrollment.student.chineseName}</span>
        )}
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <GradeBreakdownCard
          grade={grade}
          weights={{
            attendance: course.weightAttendance,
            assignment: course.weightAssignment,
            quiz: course.weightQuiz,
            midterm: course.weightMidterm,
            final: course.weightFinal,
            impression: course.weightImpression,
          }}
          labels={{
            title: t("grade"),
            passing: t("passing"),
            belowPassing: t("belowPassing"),
            attendance: tDashboard("weightAttendance"),
            assignment: tDashboard("weightAssignment"),
            quiz: tDashboard("weightQuiz"),
            midterm: tDashboard("weightMidterm"),
            final: tDashboard("weightFinal"),
            impression: tDashboard("weightImpression"),
          }}
        />

        <section className={`${cardClass} space-y-3 p-4`}>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("evaluation")}</h3>
          <EvaluationForm
            courseId={courseId}
            enrollmentId={enrollmentId}
            initialNarrative={enrollment.evaluation?.narrative ?? ""}
            initialImpressionScore={enrollment.evaluation?.impressionScore ?? null}
            maxImpressionScore={course.weightImpression}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`overflow-hidden ${cardClass}`}>
          <h3 className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            {t("attendanceHistory")}
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {enrollment.attendance.map((a) => {
                const Icon = attendanceIcon[a.status];
                return (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="tabular px-4 py-1.5 text-zinc-500 dark:text-zinc-500">{dateFmt.format(a.session.date)}</td>
                    <td className="px-4 py-1.5">
                      <span className={`flex items-center gap-1.5 ${attendanceColor[a.status]}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {tStatus(a.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {enrollment.attendance.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-zinc-400 dark:text-zinc-600">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className={`overflow-hidden ${cardClass}`}>
          <h3 className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            {t("scoreHistory")}
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {enrollment.scores.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="tabular px-4 py-1.5 text-zinc-500 dark:text-zinc-500">{dateFmt.format(s.session.date)}</td>
                  <td className="px-4 py-1.5 text-zinc-700 dark:text-zinc-300">{s.category}</td>
                  <td className="tabular px-4 py-1.5 text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {s.retakeScore ?? s.originalScore ?? "—"}
                    {s.retakeScore !== null && s.originalScore !== null && (
                      <span className="text-zinc-400 dark:text-zinc-600"> ({s.originalScore})</span>
                    )}
                  </td>
                </tr>
              ))}
              {enrollment.scores.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-400 dark:text-zinc-600">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
