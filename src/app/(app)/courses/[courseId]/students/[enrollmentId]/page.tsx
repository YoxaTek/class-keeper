import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { loadStudentProgress } from "@/lib/studentProgress";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StudentProgress } from "@/components/StudentProgress";

// Teacher/TA entry to the shared student record — see StudentProgress.
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; enrollmentId: string }>;
}) {
  const { courseId, enrollmentId } = await params;
  await requireCourseAccess(courseId);
  const tRoster = await getTranslations("roster");

  const progress = await loadStudentProgress(enrollmentId, courseId);
  if (!progress) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: tRoster("title"), href: `/courses/${courseId}/roster` },
          { label: progress.enrollment.student.name },
        ]}
      />
      <StudentProgress progress={progress} editable />
    </>
  );
}
