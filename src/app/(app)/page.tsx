import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Bookmark, CalendarDays, Users, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { computeGradesForCourse } from "@/lib/grading/computeCourseGrades";
import { QrScannerButton } from "@/components/QrScanner";
import { CourseFormDrawer } from "./CourseFormDrawer";
import { CourseDeleteButton } from "./CourseDeleteButton";

export default async function DashboardPage() {
  const { id: userId, role } = await getCurrentUser();
  if (role === "STUDENT") redirect("/me");

  const courses = await prisma.course.findMany({
    where:
      role === "TEACHER"
        ? { teacherId: userId }
        : { assistants: { some: { userId } } },
    include: { subject: true, _count: { select: { enrollments: true } } },
    orderBy: { startDate: "desc" },
  });

  // One extra query per course for the attendance ring + below-passing
  // count — a teacher's course list is small (single digits), so this
  // stays cheap without needing computeGradesForCourse to take a
  // pre-fetched course.
  const gradeSummaries = new Map(
    await Promise.all(
      courses.map(async (course) => {
        const { results } = await computeGradesForCourse(course.id);
        const attendancePct = results.length
          ? Math.round((results.reduce((sum, r) => sum + r.grade.attendance.pct, 0) / results.length) * 100)
          : null;
        const belowPassingCount = results.filter((r) => !r.grade.passing).length;
        return [course.id, { attendancePct, belowPassingCount }] as const;
      })
    )
  );

  const t = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-500">{t("subtitle", { count: courses.length })}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <QrScannerButton
            triggerLabel={t("acceptInvite")}
            title={t("acceptInviteTitle")}
            helpText={t("acceptInviteHelp")}
            className="shrink-0 whitespace-nowrap"
          />
          {role === "TEACHER" && <CourseFormDrawer mode="create" />}
        </div>
      </div>

      {courses.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {courses.map((course) => {
            const summary = gradeSummaries.get(course.id)!;
            return (
              <article
                key={course.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Link href={`/courses/${course.id}/course`} className="block space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[11.5px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                        <Bookmark className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        <span className="truncate">{course.name}</span>
                      </p>
                      <p className="truncate text-[16px] font-bold text-zinc-900 dark:text-zinc-100">
                        {course.subject.name}
                      </p>
                    </div>
                    {summary.attendancePct === null ? (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                        title={t("inviteFirstStudent")}
                      >
                        <UserPlus className="h-4 w-4" aria-hidden />
                      </div>
                    ) : (
                      <div
                        className="flex h-8 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-zinc-200 px-2.5 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                        title={`${course._count.enrollments} ${t("students")}`}
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        <span className="tabular text-xs font-bold leading-none">{course._count.enrollments}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11.5px] text-zinc-600 dark:text-zinc-500">
                    <span className="tabular flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {dateFmt.format(course.startDate)} – {dateFmt.format(course.endDate)}
                    </span>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-900">
                  {summary.attendancePct === null ? (
                    <Link
                      href={`/courses/${course.id}/roster`}
                      className="tabular rounded-full bg-[#0f6e56]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0f6e56] dark:bg-[rgba(45,212,191,0.12)] dark:text-teal-400"
                    >
                      {t("inviteFirstStudent")}
                    </Link>
                  ) : (
                    <p
                      className={`tabular rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                        summary.belowPassingCount > 0
                          ? "bg-red-50 text-red-700 dark:bg-[rgba(248,113,113,0.12)] dark:text-red-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {t("belowPassingCount", { count: summary.belowPassingCount })}
                    </p>
                  )}

                  {course.teacherId === userId && (
                    <div className="flex items-center gap-1">
                      <CourseFormDrawer
                        mode="edit"
                        courseId={course.id}
                        initial={{
                          subjectName: course.subject.name,
                          name: course.name,
                          startDate: course.startDate.toISOString().slice(0, 10),
                          endDate: course.endDate.toISOString().slice(0, 10),
                          weightAttendance: course.weightAttendance,
                          weightAssignment: course.weightAssignment,
                          weightQuiz: course.weightQuiz,
                          weightMidterm: course.weightMidterm,
                          weightFinal: course.weightFinal,
                          weightImpression: course.weightImpression,
                          maxExcusedAbsences: course.maxExcusedAbsences,
                          passingScore: course.passingScore,
                          institute: course.institute ?? "",
                        }}
                      />
                      <CourseDeleteButton courseId={course.id} courseLabel={`${course.subject.name} · ${course.name}`} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
          {role === "TA" ? t("taPending") : "—"}
        </div>
      )}
    </div>
  );
}
