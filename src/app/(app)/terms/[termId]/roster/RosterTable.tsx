"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Enrollment, Student } from "@prisma/client";

type Row = Enrollment & { student: Student };

export function RosterTable({ termId, enrollments }: { termId: string; enrollments: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function startEdit(row: Row) {
    setEditingId(row.id);
    setDraftName(row.student.name);
  }

  async function saveEdit(enrollmentId: string) {
    await fetch(`/api/terms/${termId}/students/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftName }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function remove(enrollmentId: string) {
    if (!confirm(t("roster.removeStudent") + "?")) return;
    await fetch(`/api/terms/${termId}/students/${enrollmentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-black/10 text-left dark:border-white/10">
          <th className="py-2 pr-4">{t("common.name")}</th>
          <th className="py-2 pr-4">{t("common.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {enrollments.map((row) => (
          <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
            <td className="py-2 pr-4">
              {editingId === row.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => saveEdit(row.id)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(row.id)}
                  className="rounded border border-black/10 px-2 py-1 dark:border-white/20"
                />
              ) : (
                <Link href={`/terms/${termId}/students/${row.id}`} className="underline">
                  {row.student.name}
                </Link>
              )}
            </td>
            <td className="py-2 pr-4 flex gap-3">
              <button onClick={() => startEdit(row)} className="underline">
                {t("common.edit")}
              </button>
              <button onClick={() => remove(row.id)} className="text-red-600 underline">
                {t("common.delete")}
              </button>
            </td>
          </tr>
        ))}
        {enrollments.length === 0 && (
          <tr>
            <td colSpan={2} className="py-6 text-center text-black/60 dark:text-white/60">
              —
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
