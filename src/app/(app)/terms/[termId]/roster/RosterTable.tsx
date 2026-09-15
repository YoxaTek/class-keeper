"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Enrollment, Student } from "@prisma/client";
import { InviteLinkBox } from "@/components/InviteLinkBox";

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
      {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
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
              <td className="py-2 pr-4 align-top">
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
              <td className="py-2 pr-4 align-top">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => startEdit(row)} className="underline">
                    {t("common.edit")}
                  </button>
                  <button onClick={() => remove(row.id)} className="text-red-600 underline">
                    {t("common.delete")}
                  </button>
                  {!row.student.userId && !inviteTokens[row.student.id] && (
                    <button onClick={() => invite(row.student.id)} className="underline">
                      {t("roster.invite")}
                    </button>
                  )}
                </div>
                {inviteTokens[row.student.id] && (
                  <div className="mt-2 max-w-xs">
                    <InviteLinkBox token={inviteTokens[row.student.id]} />
                  </div>
                )}
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
    </div>
  );
}
