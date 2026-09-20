"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { Student } from "@prisma/client";
import { cardClass } from "@/components/ui/styles";
import { StudentFormDrawer } from "./StudentFormDrawer";

type Row = {
  id: string; // enrollment id
  student: Student;
  attendancePct: number;
  scorePct: number;
  passing: boolean;
};

export function RosterTable({ courseId, rows }: { courseId: string; rows: Row[] }) {
  const t = useTranslations();
  const router = useRouter();

  async function remove(enrollmentId: string) {
    if (!confirm(t("roster.removeStudent") + "?")) return;
    await fetch(`/api/courses/${courseId}/students/${enrollmentId}`, { method: "DELETE" });
    router.refresh();
  }

  function rowActions(row: Row) {
    return (
      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-500">
        <StudentFormDrawer
          courseId={courseId}
          enrollmentId={row.id}
          initialName={row.student.name}
          initialChineseName={row.student.chineseName ?? ""}
          initialStudentId={row.student.studentId ?? ""}
          initialEmail={row.student.email ?? ""}
        />
        <button
          onClick={() => remove(row.id)}
          title={t("common.delete")}
          className="rounded p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Table: comfortable at desktop widths, but a fixed set of columns
          doesn't leave room for a CJK header to wrap without going
          vertical, so phones get the card list below instead. */}
      <div className={`hidden overflow-hidden sm:block ${cardClass}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="w-10 px-4 py-2">#</th>
              <th className="px-4 py-2">{t("common.name")}</th>
              <th className="whitespace-nowrap px-4 py-2">{t("common.chineseName")}</th>
              <th className="px-4 py-2">{t("join.studentId")}</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">{t("roster.attendance")}</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">{t("roster.score")}</th>
              <th className="px-4 py-2 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
            {rows.map((row, i) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                <td className="tabular px-4 py-2 align-top text-zinc-400 dark:text-zinc-600">{i + 1}</td>
                <td className="px-4 py-2 align-top">
                  <Link
                    href={`/courses/${courseId}/students/${row.id}`}
                    className="font-medium text-zinc-900 hover:text-[#0f6e56] dark:text-zinc-100"
                  >
                    {row.student.name}
                  </Link>
                </td>
                <td className="px-4 py-2 align-top text-zinc-600 dark:text-zinc-400">
                  {row.student.chineseName || "-"}
                </td>
                <td className="tabular px-4 py-2 align-top text-zinc-600 dark:text-zinc-400">
                  {row.student.studentId || "-"}
                </td>
                <td className="tabular px-4 py-2 align-top text-right text-zinc-600 dark:text-zinc-400">
                  {row.attendancePct}%
                </td>
                <td
                  className={`tabular px-4 py-2 align-top text-right font-medium ${
                    row.passing ? "text-[#0f6e56] dark:text-teal-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {row.scorePct}%
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex justify-end">{rowActions(row)}</div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards: phone-width roster view — one card per student. */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className={`${cardClass} space-y-2 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <Link href={`/courses/${courseId}/students/${row.id}`} className="block">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.student.name}</span>
                  {row.student.chineseName && (
                    <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-500">{row.student.chineseName}</span>
                  )}
                </Link>
                <p className="tabular text-xs text-zinc-500 dark:text-zinc-500">
                  {t("join.studentId")}: {row.student.studentId || "-"}
                </p>
              </div>
              {rowActions(row)}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="tabular text-zinc-500 dark:text-zinc-500">
                {t("roster.attendance")}: <span className="font-medium text-zinc-700 dark:text-zinc-300">{row.attendancePct}%</span>
              </span>
              <span
                className={`tabular font-medium ${row.passing ? "text-[#0f6e56] dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}
              >
                {t("roster.score")}: {row.scorePct}%
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className={`${cardClass} px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500`}>—</div>
        )}
      </div>
    </div>
  );
}
