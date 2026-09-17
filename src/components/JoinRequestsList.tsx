"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import type { JoinRequest } from "@prisma/client";
import { cardClass } from "@/components/ui/styles";

export function JoinRequestsList({ termId, requests }: { termId: string; requests: JoinRequest[] }) {
  const t = useTranslations("roster");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/terms/${termId}/join-requests/${id}`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("joinRequestError"));
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    await fetch(`/api/terms/${termId}/join-requests/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  if (requests.length === 0) return null;

  return (
    <div className={`${cardClass} space-y-3 p-4`}>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {t("pendingJoinRequests")} <span className="tabular text-zinc-400 dark:text-zinc-600">({requests.length})</span>
      </h2>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.name}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">
                {r.studentId} · {r.email}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => approve(r.id)}
                disabled={busyId === r.id}
                title={t("approve")}
                className="rounded p-1.5 text-zinc-500 hover:bg-[#0f6e56]/10 hover:text-[#0f6e56] disabled:opacity-50 dark:text-zinc-500 dark:hover:text-teal-400"
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => reject(r.id)}
                disabled={busyId === r.id}
                title={t("reject")}
                className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
