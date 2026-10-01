import { notFound } from "next/navigation";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { buildClassRecordTitle, courseWeekNumber } from "@/lib/classRecordTitle";
import { ClassDetailTable } from "./ClassDetailTable";
import { SessionHeader } from "./SessionHeader";
import s from "./session.module.scss";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;
  const { course } = await requireCourseAccess(courseId);
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
    // min-h-full + flex-col, with ClassDetailTable's own root doing the same
    // and its sticky Save bar pinned via mt-auto — so the bar sits flush at
    // the bottom of the screen even when the roster is short enough that
    // the page doesn't scroll, not just while scrolling a long one.
    <div className={s.page}>
      <SessionHeader backHref={`/courses/${courseId}`} title={sessionLabel} subtitle={dateFmt.format(session.date)} />

      <div className={s.table}>
        <ClassDetailTable
          sessionId={sessionId}
          pdfTitle={pdfTitle}
          session={session}
          assessments={session.assessments}
          enrollments={enrollments}
        />
      </div>
    </div>
  );
}
