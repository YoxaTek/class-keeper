import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { computeGradesForCourse } from "@/lib/grading/computeCourseGrades";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JoinLinkCard } from "@/components/JoinLinkCard";
import { RosterTable } from "./RosterTable";
import { BulkAddForm } from "./BulkAddForm";

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
      passing: grade.passing,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div>
      <Breadcrumb items={[{ label: t("title") }]} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          <RosterTable courseId={courseId} rows={rows} />
        </div>

        <div className="space-y-4">
          <JoinLinkCard courseId={courseId} />
          <BulkAddForm courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
