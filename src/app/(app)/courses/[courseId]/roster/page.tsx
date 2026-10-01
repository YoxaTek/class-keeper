import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { computeGradesForCourse } from "@/lib/grading/computeCourseGrades";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JoinLinkCard } from "@/components/JoinLinkCard";
import { RosterTable } from "./RosterTable";
import { BulkAddForm } from "./BulkAddForm";
import s from "./roster.module.scss";

export default async function RosterPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requireCourseAccess(courseId);
  const t = await getTranslations("roster");

  const { course, results } = await computeGradesForCourse(courseId);
  // Weights are per-course and don't have to sum to 100, so the score % is
  // relative to this course's own total rather than assumed out of 100.
  const totalMax =
    course.weightAttendance +
    course.weightAssignment +
    course.weightQuiz +
    course.weightMidterm +
    course.weightFinal +
    course.weightImpression;

  const rows = results
    .map(({ enrollment, grade }) => ({
      id: enrollment.id,
      student: enrollment.student,
      attendancePct: Math.round(grade.attendance.pct * 100),
      scorePct: totalMax > 0 ? Math.round((grade.total / totalMax) * 100) : 0,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div>
      <Breadcrumb items={[{ label: t("title") }]} />

      <div className={s.layout}>
        <RosterTable courseId={courseId} rows={rows} />

        <div className={s.side}>
          <JoinLinkCard courseId={courseId} />
          <BulkAddForm courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
