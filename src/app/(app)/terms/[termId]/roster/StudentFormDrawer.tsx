"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { inputClass, labelClass } from "@/components/ui/styles";

export function StudentFormDrawer({
  termId,
  enrollmentId,
  initialName,
  initialChineseName,
  initialStudentId,
  initialEmail,
}: {
  termId: string;
  enrollmentId: string;
  initialName: string;
  initialChineseName: string;
  initialStudentId: string;
  initialEmail: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [chineseName, setChineseName] = useState(initialChineseName);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/terms/${termId}/students/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        chineseName: chineseName || null,
        // Locked once already set (usually by the student's own self-serve
        // join) — see the API route, which enforces this server-side too.
        ...(!initialStudentId && { studentId: studentId || null }),
        ...(!initialEmail && { email: email || null }),
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not save the student.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={t("common.edit")}
        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <Drawer
      title={t("roster.editStudent")}
      onClose={() => setOpen(false)}
      footer={
        <div className="flex gap-2">
          <Button type="submit" form="student-form" variant="primary" disabled={submitting}>
            {t("common.save")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      }
    >
      <form id="student-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>{t("common.name")}</label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>{t("common.chineseName")}</label>
          <input value={chineseName} onChange={(e) => setChineseName(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>{t("join.studentId")}</label>
          {initialStudentId ? (
            <p className="tabular px-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-300">{initialStudentId}</p>
          ) : (
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass} />
          )}
        </div>
        <div className="space-y-1">
          <label className={labelClass}>{t("common.email")}</label>
          {initialEmail ? (
            <p className="px-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-300">{initialEmail}</p>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Drawer>
  );
}
