"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface SessionFormValues {
  date: string;
  label: string;
  hasAttendance: boolean;
  hasQuiz: boolean;
  hasAssignment: boolean;
  hasMidterm: boolean;
  hasFinal: boolean;
}

const FLAGS: { key: keyof SessionFormValues; labelKey: string }[] = [
  { key: "hasAttendance", labelKey: "sessions.attendance" },
  { key: "hasQuiz", labelKey: "sessions.quiz" },
  { key: "hasAssignment", labelKey: "sessions.assignment" },
  { key: "hasMidterm", labelKey: "sessions.midterm" },
  { key: "hasFinal", labelKey: "sessions.final" },
];

export function SessionForm({
  termId,
  sessionId,
  initial,
}: {
  termId: string;
  sessionId?: string;
  initial?: SessionFormValues;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [values, setValues] = useState<SessionFormValues>(
    initial ?? {
      date: "",
      label: "",
      hasAttendance: true,
      hasQuiz: false,
      hasAssignment: false,
      hasMidterm: false,
      hasFinal: false,
    }
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const url = sessionId
      ? `/api/terms/${termId}/sessions/${sessionId}`
      : `/api/terms/${termId}/sessions`;
    const method = sessionId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setSubmitting(false);
    if (res.ok) {
      router.push(`/terms/${termId}`);
      router.refresh();
    }
  }

  async function onDelete() {
    if (!sessionId) return;
    if (!confirm(t("common.delete") + "?")) return;
    await fetch(`/api/terms/${termId}/sessions/${sessionId}`, { method: "DELETE" });
    router.push(`/terms/${termId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className="block text-sm">{t("common.date")}</label>
        <input
          type="date"
          required
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm">{t("sessions.label")}</label>
        <input
          value={values.label}
          onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
          placeholder="e.g. L1 生詞"
          className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("sessions.covers")}</legend>
        {FLAGS.map(({ key, labelKey }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values[key] as boolean}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
            />
            {t(labelKey)}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {t("common.save")}
        </button>
        {sessionId && (
          <button type="button" onClick={onDelete} className="rounded border px-3 py-2 text-sm text-red-600">
            {t("common.delete")}
          </button>
        )}
      </div>
    </form>
  );
}
