import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookMarked, BookOpenText, CalendarDays, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
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

  const t = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>
        {role === "TEACHER" && <CourseFormDrawer mode="create" />}
      </div>

      {courses.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <article
              key={course.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <Link href={`/courses/${course.id}/course`} className="block space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <BookMarked className="h-3 w-3" aria-hidden />
                    {t("term")}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{course.name}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <BookOpenText className="h-3 w-3" aria-hidden />
                    {t("subject")}
                  </p>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{course.subject.name}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    {t("dates")}
                  </p>
                  <p className="tabular text-sm text-zinc-600 dark:text-zinc-400">
                    {dateFmt.format(course.startDate)} – {dateFmt.format(course.endDate)}
                  </p>
                </div>
              </Link>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-900">
                <p className="tabular flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {t("students")}: {course._count.enrollments}
                </p>

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
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
          {role === "TA" ? t("taPending") : "—"}
        </div>
      )}
    </div>
  );
}
