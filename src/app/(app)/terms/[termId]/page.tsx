import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { cardClass } from "@/components/ui/styles";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ClassFormDrawer } from "./ClassFormDrawer";
import { ClassDeleteButton } from "./ClassDeleteButton";
import { categorySessionMax, pctFor } from "@/lib/grading/calculateGrade";

type Filter = "all" | "upcoming" | "past";

export default async function SessionsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ termId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { termId } = await params;
  const { term } = await requireTermAccess(termId);
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = rawFilter === "upcoming" || rawFilter === "past" ? rawFilter : "all";
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const allSessions = await prisma.session.findMany({
    where: { termId },
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
    ]
      .filter(Boolean)
      .join(", ");

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t("sessions.filterAll"), count: allSessions.length },
    { key: "upcoming", label: t("sessions.filterUpcoming"), count: upcomingSessions.length },
    { key: "past", label: t("sessions.filterPast"), count: pastSessions.length },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: term.name, href: `/terms/${termId}` }, { label: t("sessions.title") }]} />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? `/terms/${termId}` : `/terms/${termId}?filter=${f.key}`}
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
        <ClassFormDrawer mode="create" termId={termId} />
      </div>

      <div className={`overflow-hidden ${cardClass}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-4 py-2">{t("common.date")}</th>
              <th className="px-4 py-2">{t("sessions.label")}</th>
              <th className="px-4 py-2">{t("sessions.covers")}</th>
              <th className="px-4 py-2 text-right">{t("sessions.attendanceTurnout")}</th>
              <th className="px-4 py-2 text-right">{t("sessions.scoreAverage")}</th>
              <th className="w-24 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
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

              const href = `/terms/${termId}/sessions/${s.id}`;

              return (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900">
                  <td className="p-0">
                    <Link href={href} className="tabular block px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {dateFmt.format(s.date)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {s.label ?? "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                      {covers(s) || "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="tabular block px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-500">
                      {s.hasAttendance ? turnout : "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="tabular block px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-500">
                      {scoreAvg}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <ClassFormDrawer
                        mode="edit"
                        termId={termId}
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
                        }}
                      />
                      <ClassDeleteButton termId={termId} sessionId={s.id} />
                      <Link
                        href={href}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
