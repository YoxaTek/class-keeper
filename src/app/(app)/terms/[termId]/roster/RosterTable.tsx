"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, UserPlus, CircleCheck } from "lucide-react";
import type { Enrollment, Student } from "@prisma/client";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import { inputClassSm, cardClass } from "@/components/ui/styles";

type Row = Enrollment & { student: Student };

export function RosterTable({ termId, enrollments }: { termId: string; enrollments: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  async function invite(studentId: string) {
    setInviteError(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "STUDENT", studentId }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setInviteTokens((tokens) => ({ ...tokens, [studentId]: body.token }));
    } else {
      setInviteError(typeof body?.error === "string" ? body.error : t("onboarding.genericError"));
    }
  }

  return (
    <div className="space-y-2">
      {inviteError && <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
      <div className={`overflow-hidden ${cardClass}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-4 py-2">{t("common.name")}</th>
              <th className="px-4 py-2 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
            {enrollments.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                <td className="px-4 py-2 align-top">
                  {editingId === row.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => saveEdit(row.id)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(row.id)}
                      className={inputClassSm}
                    />
                  ) : (
                    <Link
                      href={`/terms/${termId}/students/${row.id}`}
                      className="flex items-center gap-1.5 font-medium text-zinc-900 hover:text-[#0f6e56] dark:text-zinc-100"
                    >
                      {row.student.name}
                      {row.student.userId && (
                        <CircleCheck
                          className="h-3.5 w-3.5 text-[#0f6e56] dark:text-teal-400"
                          aria-label="Linked account"
                        />
                      )}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex items-center justify-end gap-1 text-zinc-500 dark:text-zinc-500">
                    <button
                      onClick={() => startEdit(row)}
                      title={t("common.edit")}
                      className="rounded p-1.5 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      onClick={() => remove(row.id)}
                      title={t("common.delete")}
                      className="rounded p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    {!row.student.userId && !inviteTokens[row.student.id] && (
                      <button
                        onClick={() => invite(row.student.id)}
                        title={t("roster.invite")}
                        className="rounded p-1.5 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                  {inviteTokens[row.student.id] && (
                    <div className="mt-2">
                      <InviteLinkBox token={inviteTokens[row.student.id]} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
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
