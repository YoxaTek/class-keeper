import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { computeGradesForTerm } from "@/lib/grading/computeTermGrades";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JoinLinkCard } from "@/components/JoinLinkCard";
import { RosterTable } from "./RosterTable";
import { BulkAddForm } from "./BulkAddForm";

export default async function RosterPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations("roster");

  const { term, results } = await computeGradesForTerm(termId);
  // Weights are per-term and don't have to sum to 100, so the score % is
  // relative to this term's own total rather than assumed out of 100.
  const totalMax =
    term.weightAttendance +
    term.weightAssignment +
    term.weightQuiz +
    term.weightMidterm +
    term.weightFinal +
    term.weightImpression;

  const rows = results
    .map(({ enrollment, grade }) => ({
      id: enrollment.id,
      student: enrollment.student,
      attendancePct: Math.round(grade.attendance.pct * 100),
      scorePct: totalMax > 0 ? Math.round((grade.total / totalMax) * 100) : 0,
      passing: grade.passing,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div>
      <Breadcrumb items={[{ label: t("title") }]} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h2>
            <span className="tabular text-xs text-zinc-500 dark:text-zinc-500">{rows.length} / 30</span>
          </div>
          <RosterTable termId={termId} rows={rows} />
        </div>

        <div className="space-y-4">
          <JoinLinkCard termId={termId} />
          {rows.length >= 30 ? (
            <p className="text-sm text-amber-700 dark:text-amber-500">{t("capReached")}</p>
          ) : (
            <BulkAddForm termId={termId} remaining={30 - rows.length} />
          )}
        </div>
      </div>
    </div>
  );
}
