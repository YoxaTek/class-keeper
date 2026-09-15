import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { computeGradesForTerm } from "@/lib/grading/computeTermGrades";

export default async function BelowPassingPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations("belowPassing");

  const { results } = await computeGradesForTerm(termId);
  const belowPassing = results
    .filter((r) => !r.grade.passing)
    .sort((a, b) => a.grade.total - b.grade.total);

  return (
    <div className="space-y-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left dark:border-white/10">
            <th className="py-2 pr-4">{"Student"}</th>
            <th className="py-2 pr-4">{"Total"}</th>
          </tr>
        </thead>
        <tbody>
          {belowPassing.map(({ enrollment, grade }) => (
            <tr key={enrollment.id} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-4">
                <Link href={`/terms/${termId}/students/${enrollment.id}`} className="underline">
                  {enrollment.student.name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-red-600">{grade.total.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {belowPassing.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">{t("empty")}</p>
      )}
    </div>
  );
}
