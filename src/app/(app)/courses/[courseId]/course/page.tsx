import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarRange, ChevronRight, GraduationCap, Users } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cardClass } from "@/components/ui/styles";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { CourseFormDrawer } from "../../../CourseFormDrawer";
import { CourseDeleteButton } from "../../../CourseDeleteButton";
import { InviteCoTeacherForm } from "../../../InviteCoTeacherForm";
import { InviteTAForm } from "../roster/InviteTAForm";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user } = await requireCourseAccess(courseId);
  const t = await getTranslations("dashboard");
  const tAll = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: { subject: true, _count: { select: { enrollments: true, sessions: true } } },
  });

  const weights = [
    { label: t("weightAttendance"), value: course.weightAttendance },
    { label: t("weightAssignment"), value: course.weightAssignment },
    { label: t("weightQuiz"), value: course.weightQuiz },
    { label: t("weightMidterm"), value: course.weightMidterm },
    { label: t("weightFinal"), value: course.weightFinal },
    { label: t("weightImpression"), value: course.weightImpression },
  ];
  const totalWeight = weights.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t("course") }]} />

      <section className={`${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{course.subject.name}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{course.name}</p>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {dateFmt.format(course.startDate)} - {dateFmt.format(course.endDate)}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              {t("institute")}: <span className="text-zinc-700 dark:text-zinc-300">{course.institute || "-"}</span>
            </p>
          </div>

          {course.teacherId === user.id && (
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
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Link
          href={`/courses/${course.id}/roster`}
          className={`${cardClass} block p-4 transition-colors hover:border-[#0f6e56]/50 active:bg-zinc-50 dark:active:bg-zinc-800/60`}
        >
          <p className="flex items-center justify-between gap-1.5 text-xs uppercase tracking-wide text-[#0f6e56] dark:text-teal-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("students")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{course._count.enrollments}</p>
        </Link>

        <Link
          href={`/courses/${course.id}`}
          className={`${cardClass} block p-4 transition-colors hover:border-[#0f6e56]/50 active:bg-zinc-50 dark:active:bg-zinc-800/60`}
        >
          <p className="flex items-center justify-between gap-1.5 text-xs uppercase tracking-wide text-[#0f6e56] dark:text-teal-400">
            <span className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tAll("sessions.title")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{course._count.sessions}</p>
        </Link>

        <article className={`${cardClass} p-4`}>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("passingScore")}
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{course.passingScore}</p>
        </article>
      </section>

      <section>
        <article className={`${cardClass} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("weights")}</h2>
            <span
              className={`tabular rounded-full px-2 py-0.5 text-xs font-medium ${
                totalWeight === 100
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {totalWeight}/100
            </span>
          </div>
          {weights.map((weight) => (
            <div
              key={weight.label}
              className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800"
            >
              <p className="text-zinc-700 dark:text-zinc-300">{weight.label}</p>
              <p className="tabular font-medium text-zinc-900 dark:text-zinc-100">{weight.value}%</p>
            </div>
          ))}
        </article>
      </section>

      {user.role === "TEACHER" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <InviteTAForm courseId={course.id} />
          {user.organizationId && <InviteCoTeacherForm />}
        </section>
      )}
    </div>
  );
}