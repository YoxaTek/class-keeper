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
      {/* Cards: one card per student, at every screen width. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
