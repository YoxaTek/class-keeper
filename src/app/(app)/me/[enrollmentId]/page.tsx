import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/currentUser";
import { loadStudentProgress } from "@/lib/studentProgress";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StudentProgress } from "@/components/StudentProgress";
import { FeedbackForm } from "../FeedbackForm";
import css from "./enrollment.module.scss";

// The student's own entry to the shared student record — the same screen a
// teacher/TA sees (see StudentProgress), read-only, plus the end-of-course
// feedback form.
export default async function MyCoursePage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") redirect("/");

  const { enrollmentId } = await params;
  const t = await getTranslations("studentView");

  const progress = await loadStudentProgress(enrollmentId);
  // Never trust a client-supplied enrollmentId without checking it's
  // actually this student's own — a guessed/adjacent id must 404, not leak
  // another student's grades.
  if (!progress || progress.enrollment.student.userId !== user.id) notFound();

  const { course, enrollment } = progress;

  return (
    <div className={css.wrap}>
      <Breadcrumb
        items={[
          { label: t("myCourses"), href: "/me" },
          { label: `${course.subject.name} · ${course.name}` },
        ]}
      />
      <StudentProgress progress={progress} editable={false} />
      <div className={css.feedbackForm}>
        <FeedbackForm enrollmentId={enrollment.id} existing={enrollment.feedback} />
      </div>
    </div>
  );
}
