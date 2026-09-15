import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { buttonClass, cardClass } from "@/components/ui/styles";

function effectiveScore(record: { originalScore: number | null; retakeScore: number | null }) {
  return record.retakeScore ?? record.originalScore ?? 0;
}

export default async function SessionsListPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const sessions = await prisma.session.findMany({
    where: { termId },
    include: { attendance: true, scores: true },
    orderBy: { date: "asc" },
  });

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

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/terms/${termId}/sessions/new`} className={buttonClass("primary", "sm")}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("sessions.newSession")}
        </Link>
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
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
            {sessions.map((s) => {
              const countable = s.attendance.filter(
                (a) => a.status !== "NOT_ENROLLED" && a.status !== "ABROAD"
              );
              const present = countable.filter((a) => a.status === "PRESENT").length;
              const turnout = countable.length ? `${Math.round((present / countable.length) * 100)}%` : "—";
              const scoreAvg = s.scores.length
                ? (s.scores.reduce((sum, r) => sum + effectiveScore(r), 0) / s.scores.length).toFixed(1)
                : "—";

              return (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900">
                  <td className="p-0">
                    <Link href={`/terms/${termId}/sessions/${s.id}`} className="tabular block px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {dateFmt.format(s.date)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/terms/${termId}/sessions/${s.id}`} className="block px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {s.label ?? "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/terms/${termId}/sessions/${s.id}`} className="block px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                      {covers(s) || "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/terms/${termId}/sessions/${s.id}`} className="tabular block px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-500">
                      {s.hasAttendance ? turnout : "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/terms/${termId}/sessions/${s.id}`} className="tabular block px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-500">
                      {scoreAvg}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
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
