import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ClassFormDrawer } from "./ClassFormDrawer";
import { ClassDeleteButton } from "./ClassDeleteButton";
import { categorySessionMax, pctFor } from "@/lib/grading/calculateGrade";

type Filter = "all" | "upcoming" | "past";

export default async function SessionsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { courseId } = await params;
  await requireCourseAccess(courseId);
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = rawFilter === "upcoming" || rawFilter === "past" ? rawFilter : "all";
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const allSessions = await prisma.session.findMany({
    where: { courseId },
    include: { attendance: true, scores: true },
    orderBy: { date: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingSessions = allSessions.filter((s) => s.date >= today);
  const pastSessions = allSessions.filter((s) => s.date < today);
  const sessions = filter === "upcoming" ? upcomingSessions : filter === "past" ? pastSessions : allSessions;

  const covers = (s: (typeof sessions)[number]) =>
    [
      s.hasAttendance && t("sessions.attendance"),
      s.hasQuiz && t("sessions.quiz"),
      s.hasAssignment && t("sessions.assignment"),
      s.hasMidterm && t("sessions.midterm"),
      s.hasFinal && t("sessions.final"),
      s.hasFeedback && t("sessions.feedback"),
    ]
      .filter(Boolean)
      .join(", ");

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t("sessions.filterAll"), count: allSessions.length },
    { key: "upcoming", label: t("sessions.filterUpcoming"), count: upcomingSessions.length },
    { key: "past", label: t("sessions.filterPast"), count: pastSessions.length },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Breadcrumb items={[{ label: t("sessions.title") }]} />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? `/courses/${courseId}` : `/courses/${courseId}?filter=${f.key}`}
              className={`tabular rounded-md px-2.5 py-1.5 text-sm ${
                filter === f.key
                  ? "bg-[#0f6e56]/10 font-medium text-[#0f6e56] dark:text-teal-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
              }`}
            >
              {f.label} ({f.count})
            </Link>
          ))}
        </div>
        <ClassFormDrawer mode="create" courseId={courseId} />
      </div>

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s) => {
            const countable = s.attendance.filter((a) => a.status !== "NOT_ENROLLED");
            const present = countable.filter((a) => a.status === "PRESENT").length;
            const turnout = countable.length ? `${Math.round((present / countable.length) * 100)}%` : "—";
            const scoreAvg = s.scores.length
              ? `${(
                  s.scores.reduce((sum, r) => sum + pctFor(r, categorySessionMax(s, r.category)), 0) /
                  s.scores.length
                ).toFixed(1)}%`
              : "—";

            const href = `/courses/${courseId}/sessions/${s.id}`;

            return (
              <article
                key={s.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <Link href={href} className="block space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="tabular text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {dateFmt.format(s.date)}
                      </p>
                      {s.label && <p className="text-sm text-zinc-700 dark:text-zinc-300">{s.label}</p>}
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">{covers(s) || "—"}</p>
                  <div className="flex gap-4 text-sm">
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-500">{t("sessions.attendanceTurnout")}: </span>
                      <span className="tabular text-zinc-700 dark:text-zinc-300">
                        {s.hasAttendance ? turnout : "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-500">{t("sessions.scoreAverage")}: </span>
                      <span className="tabular text-zinc-700 dark:text-zinc-300">{scoreAvg}</span>
                    </p>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                  <ClassFormDrawer
                    mode="edit"
                    courseId={courseId}
                    sessionId={s.id}
                    initial={{
                      date: s.date.toISOString().slice(0, 10),
                      label: s.label ?? "",
                      hasAttendance: s.hasAttendance,
                      hasQuiz: s.hasQuiz,
                      quizMaxScore: s.quizMaxScore,
                      hasAssignment: s.hasAssignment,
                      assignmentMaxScore: s.assignmentMaxScore,
                      hasMidterm: s.hasMidterm,
                      midtermMaxScore: s.midtermMaxScore,
                      hasFinal: s.hasFinal,
                      finalMaxScore: s.finalMaxScore,
                      hasFeedback: s.hasFeedback,
                    }}
                  />
                  <ClassDeleteButton courseId={courseId} sessionId={s.id} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
          {t("sessions.empty", { button: t("sessions.newSession") })}
        </div>
      )}
    </div>
  );
}
