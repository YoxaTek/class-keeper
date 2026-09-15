import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";

function effectiveScore(record: { originalScore: number | null; retakeScore: number | null }) {
  return record.retakeScore ?? record.originalScore ?? 0;
}

export default async function SessionsListPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations();

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/terms/${termId}/sessions/new`}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {t("sessions.newSession")}
        </Link>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left dark:border-white/10">
            <th className="py-2 pr-4">{t("common.date")}</th>
            <th className="py-2 pr-4">{t("sessions.label")}</th>
            <th className="py-2 pr-4">{t("sessions.covers")}</th>
            <th className="py-2 pr-4">{t("sessions.attendanceTurnout")}</th>
            <th className="py-2 pr-4">{t("sessions.scoreAverage")}</th>
          </tr>
        </thead>
        <tbody>
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
              <tr key={s.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-4">
                  <Link href={`/terms/${termId}/sessions/${s.id}`} className="underline">
                    {new Date(s.date).toLocaleDateString()}
                  </Link>
                </td>
                <td className="py-2 pr-4">{s.label ?? "—"}</td>
                <td className="py-2 pr-4">{covers(s) || "—"}</td>
                <td className="py-2 pr-4">{s.hasAttendance ? turnout : "—"}</td>
                <td className="py-2 pr-4">{scoreAvg}</td>
              </tr>
            );
          })}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-black/60 dark:text-white/60">
                —
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
