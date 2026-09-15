import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";
import { cardClass } from "@/components/ui/styles";
import { EvaluationForm } from "./EvaluationForm";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ termId: string; enrollmentId: string }>;
}) {
  const { termId, enrollmentId } = await params;
  const { term } = await requireTermAccess(termId);
  const t = await getTranslations("studentDetail");
  const tStatus = await getTranslations("attendanceStatus");
  const tDashboard = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  const [enrollment, sessions] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { id: enrollmentId, termId },
      include: {
        student: true,
        attendance: { include: { session: true }, orderBy: { session: { date: "asc" } } },
        scores: { include: { session: true }, orderBy: { session: { date: "asc" } } },
        evaluation: true,
      },
    }),
    prisma.session.findMany({ where: { termId } }),
  ]);
  if (!enrollment) notFound();

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
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{enrollment.student.name}</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${cardClass} space-y-3 p-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("grade")}</h3>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                grade.passing
                  ? "bg-[#0f6e56]/10 text-[#0f6e56] dark:text-teal-400"
                  : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              {grade.passing ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
              {grade.passing ? t("passing") : t("belowPassing")}
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <Row label={tDashboard("weightAttendance")} value={grade.attendance.score} />
              <Row label={tDashboard("weightAssignment")} value={grade.assignment.score} />
              <Row label={tDashboard("weightQuiz")} value={grade.quiz.score} />
              <Row label={tDashboard("weightMidterm")} value={grade.midterm.score} />
              <Row label={tDashboard("weightFinal")} value={grade.final.score} />
              <Row label={tDashboard("weightImpression")} value={grade.impression.score} />
              <tr className="border-t border-zinc-200 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                <td className="py-1.5">{t("total")}</td>
                <td className="tabular py-1.5 text-right">{grade.total.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={`${cardClass} space-y-3 p-4`}>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("evaluation")}</h3>
          <EvaluationForm
            termId={termId}
            enrollmentId={enrollmentId}
            initialNarrative={enrollment.evaluation?.narrative ?? ""}
            initialImpressionScore={enrollment.evaluation?.impressionScore ?? null}
            maxImpressionScore={term.weightImpression}
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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
      <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{label}</td>
      <td className="tabular py-1.5 text-right text-zinc-900 dark:text-zinc-100">{value.toFixed(1)}</td>
    </tr>
  );
}
