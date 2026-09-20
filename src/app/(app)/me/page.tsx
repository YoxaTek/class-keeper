import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookMarked, BookOpenText, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

export default async function MePage() {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") redirect("/");

  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      enrollments: {
        include: { course: { include: { subject: true } } },
        orderBy: { course: { startDate: "desc" } },
      },
    },
  });

  if (!student) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No student profile is linked to this account.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("myCourses")}</h1>

      {student.enrollments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {student.enrollments.map((enrollment) => {
            const { course } = enrollment;
            return (
              <Link
                key={enrollment.id}
                href={`/me/${enrollment.id}`}
                className="block space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <BookMarked className="h-3 w-3" aria-hidden />
                    {tDashboard("course")}
                  </p>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{course.name}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <BookOpenText className="h-3 w-3" aria-hidden />
                    {tDashboard("subject")}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{course.subject.name}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    {tDashboard("dates")}
                  </p>
                  <p className="tabular text-sm text-zinc-600 dark:text-zinc-400">
                    {dateFmt.format(course.startDate)} – {dateFmt.format(course.endDate)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
          {t("noCourses")}
        </div>
      )}
    </div>
  );
}
