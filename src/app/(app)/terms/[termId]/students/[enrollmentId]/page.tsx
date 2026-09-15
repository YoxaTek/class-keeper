import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { calculateGrade } from "@/lib/grading/calculateGrade";
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
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{enrollment.student.name}</h2>

      <section className="space-y-2">
        <h3 className="font-medium">{t("grade")}</h3>
        <table className="text-sm">
          <tbody>
            <Row label={tDashboard("weightAttendance")} value={grade.attendance.score} />
            <Row label={tDashboard("weightAssignment")} value={grade.assignment.score} />
            <Row label={tDashboard("weightQuiz")} value={grade.quiz.score} />
            <Row label={tDashboard("weightMidterm")} value={grade.midterm.score} />
            <Row label={tDashboard("weightFinal")} value={grade.final.score} />
            <Row label={tDashboard("weightImpression")} value={grade.impression.score} />
            <tr className="border-t border-black/10 font-medium dark:border-white/10">
              <td className="py-1 pr-4">{t("total")}</td>
              <td className="py-1">{grade.total.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
        <p className={grade.passing ? "text-green-700" : "text-red-600"}>
          {grade.passing ? t("passing") : t("belowPassing")}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("evaluation")}</h3>
        <EvaluationForm
          termId={termId}
          enrollmentId={enrollmentId}
          initialNarrative={enrollment.evaluation?.narrative ?? ""}
          initialImpressionScore={enrollment.evaluation?.impressionScore ?? null}
          maxImpressionScore={term.weightImpression}
        />
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("attendanceHistory")}</h3>
        <table className="w-full text-sm">
          <tbody>
            {enrollment.attendance.map((a) => (
              <tr key={a.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1 pr-4">{new Date(a.session.date).toLocaleDateString()}</td>
                <td className="py-1">{tStatus(a.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("scoreHistory")}</h3>
        <table className="w-full text-sm">
          <tbody>
            {enrollment.scores.map((s) => (
              <tr key={s.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1 pr-4">{new Date(s.session.date).toLocaleDateString()}</td>
                <td className="py-1 pr-4">{s.category}</td>
                <td className="py-1">
                  {s.retakeScore ?? s.originalScore ?? "—"}
                  {s.retakeScore !== null && s.originalScore !== null && (
                    <span className="text-black/50 dark:text-white/50"> ({s.originalScore})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-1 pr-4">{label}</td>
      <td className="py-1">{value.toFixed(1)}</td>
    </tr>
  );
}
