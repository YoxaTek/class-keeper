"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { inputClass, labelClass, iconButtonClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

export function StudentFormDrawer({
  courseId,
  enrollmentId,
  initialName,
  initialChineseName,
  initialStudentId,
  initialEmail,
}: {
  courseId: string;
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

    const res = await fetch(`/api/courses/${courseId}/students/${enrollmentId}`, {
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
        className={iconButtonClass}
      >
        <Pencil size={14} aria-hidden />
      </button>
    );
  }

  return (
    <Drawer
      title={t("roster.editStudent")}
      onClose={() => setOpen(false)}
      footer={
        <div className={f.actions}>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="student-form" variant="primary" disabled={submitting}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <form id="student-form" onSubmit={onSubmit} className={f.form}>
        <div className={f.field}>
          <label className={labelClass}>{t("common.name")}</label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className={f.field}>
          <label className={labelClass}>{t("common.chineseName")}</label>
          <input value={chineseName} onChange={(e) => setChineseName(e.target.value)} className={inputClass} />
        </div>
        <div className={f.field}>
          <label className={labelClass}>{t("join.studentId")}</label>
          {initialStudentId ? (
            <p className={`tabular ${f.value}`}>{initialStudentId}</p>
          ) : (
            <input
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
        <div className={f.field}>
          <label className={labelClass}>{t("common.email")}</label>
          {initialEmail ? (
            <p className={f.value}>{initialEmail}</p>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
        {error && <p className={f.error}>{error}</p>}
      </form>
    </Drawer>
  );
}
