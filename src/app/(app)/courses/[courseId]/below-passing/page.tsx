import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { requireCourseAccess } from "@/lib/courseAccess";
import { computeGradesForCourse } from "@/lib/grading/computeCourseGrades";
import { cardClass } from "@/components/ui/styles";
import { Breadcrumb } from "@/components/Breadcrumb";
import f from "@/components/ui/form.module.scss";
import s from "./belowPassing.module.scss";

export default async function BelowPassingPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requireCourseAccess(courseId);
  const t = await getTranslations("belowPassing");
  const tCommon = await getTranslations("common");
  const tDetail = await getTranslations("studentDetail");

  const { results } = await computeGradesForCourse(courseId);
  const belowPassing = results
    .filter((r) => !r.grade.passing)
    .sort((a, b) => a.grade.total - b.grade.total);

  return (
    <div className={f.form}>
      <Breadcrumb items={[{ label: t("title") }]} />

      {belowPassing.length === 0 ? (
        <p className={f.muted}>{t("empty")}</p>
      ) : (
        <div className={`${cardClass} ${s.tableWrap}`}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{tCommon("name")}</th>
                <th className={s.right}>{tDetail("total")}</th>
                <th>{tDetail("grade")}</th>
              </tr>
            </thead>
            <tbody>
              {belowPassing.map(({ enrollment, grade }) => (
                <tr key={enrollment.id}>
                  <td>
                    <Link href={`/courses/${courseId}/students/${enrollment.id}`} className={s.cell}>
                      {enrollment.student.name}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/courses/${courseId}/students/${enrollment.id}`} className={`tabular ${s.cell} ${s.right}`}>
                      {grade.total.toFixed(1)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/courses/${courseId}/students/${enrollment.id}`} className={s.flag}>
                      <span className={s.badge}>
                        <TriangleAlert size={14} aria-hidden />
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
