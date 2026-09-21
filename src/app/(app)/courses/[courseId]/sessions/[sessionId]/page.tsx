import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/Breadcrumb";
import { buildClassRecordTitle, courseWeekNumber } from "@/lib/classRecordTitle";
import { ClassDetailTable } from "./ClassDetailTable";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;
  const { course } = await requireCourseAccess(courseId);
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const [session, enrollments] = await Promise.all([
    prisma.session.findUnique({ where: { id: sessionId, courseId }, include: { assessments: true } }),
    prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: true,
        attendance: { where: { sessionId } },
        scores: { where: { sessionId } },
        sessionFeedback: { where: { sessionId } },
      },
      orderBy: { student: { name: "asc" } },
    }),
  ]);
  if (!session) notFound();

  const sessionLabel = session.label ?? dateFmt.format(session.date);
  const pdfTitle = buildClassRecordTitle({
    courseName: course.name,
    subjectName: course.subject.name,
    weekNumber: courseWeekNumber(course.startDate, session.date),
    date: session.date,
  });

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: t("sessions.title"), href: `/courses/${courseId}` }, { label: sessionLabel }]} />

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{sessionLabel}</h2>
          <p className="tabular text-sm text-zinc-500 dark:text-zinc-500">{dateFmt.format(session.date)}</p>
        </div>
      </div>

      <ClassDetailTable
        sessionId={sessionId}
        pdfTitle={pdfTitle}
        session={session}
        assessments={session.assessments}
        enrollments={enrollments}
      />
    </div>
  );
}
