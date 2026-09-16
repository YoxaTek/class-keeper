import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { requireTermAccess } from "@/lib/termAccess";
import { computeGradesForTerm } from "@/lib/grading/computeTermGrades";
import { cardClass } from "@/components/ui/styles";
import { Breadcrumb } from "@/components/Breadcrumb";

export default async function BelowPassingPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const { term } = await requireTermAccess(termId);
  const t = await getTranslations("belowPassing");
  const tCommon = await getTranslations("common");
  const tDetail = await getTranslations("studentDetail");

  const { results } = await computeGradesForTerm(termId);
  const belowPassing = results
    .filter((r) => !r.grade.passing)
    .sort((a, b) => a.grade.total - b.grade.total);

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: term.name, href: `/terms/${termId}` }, { label: t("title") }]} />

      {belowPassing.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("empty")}</p>
      ) : (
        <div className={`overflow-hidden ${cardClass}`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <th className="px-4 py-2">{tCommon("name")}</th>
                <th className="px-4 py-2 text-right">{tDetail("total")}</th>
                <th className="px-4 py-2">{tDetail("grade")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-950">
              {belowPassing.map(({ enrollment, grade }) => (
                <tr
                  key={enrollment.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
                >
                  <td className="p-0">
                    <Link
                      href={`/terms/${termId}/students/${enrollment.id}`}
                      className="block px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100"
                    >
                      {enrollment.student.name}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={`/terms/${termId}/students/${enrollment.id}`}
                      className="tabular block px-4 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100"
                    >
                      {grade.total.toFixed(1)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/terms/${termId}/students/${enrollment.id}`} className="flex items-center px-4 py-2.5">
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                        {t("needsAttention")}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
