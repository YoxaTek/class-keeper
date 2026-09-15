"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck2, HelpCircle, ClipboardList, GraduationCap, Award, Trash2 } from "lucide-react";
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";

export interface SessionFormValues {
  date: string;
  label: string;
  hasAttendance: boolean;
  hasQuiz: boolean;
  hasAssignment: boolean;
  hasMidterm: boolean;
  hasFinal: boolean;
}

const FLAGS: { key: keyof SessionFormValues; labelKey: string; Icon: typeof CalendarCheck2 }[] = [
  { key: "hasAttendance", labelKey: "sessions.attendance", Icon: CalendarCheck2 },
  { key: "hasQuiz", labelKey: "sessions.quiz", Icon: HelpCircle },
  { key: "hasAssignment", labelKey: "sessions.assignment", Icon: ClipboardList },
  { key: "hasMidterm", labelKey: "sessions.midterm", Icon: GraduationCap },
  { key: "hasFinal", labelKey: "sessions.final", Icon: Award },
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
      // A hard navigation, not router.push()+refresh(): the two called
      // back-to-back can race (push's transition may still be pending when
      // refresh fires, refreshing the page we're leaving instead of the one
      // we're going to), which can land on the sessions list before it's
      // picked up the just-created session. A full reload always renders
      // the fresh server state.
      window.location.href = `/terms/${termId}`;
    }
  }

  async function onDelete() {
    if (!sessionId) return;
    if (!confirm(t("common.delete") + "?")) return;
    await fetch(`/api/terms/${termId}/sessions/${sessionId}`, { method: "DELETE" });
    window.location.href = `/terms/${termId}`;
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className={labelClass}>{t("common.date")}</label>
        <DateInput value={values.date} onChange={(date) => setValues((v) => ({ ...v, date }))} required />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>{t("sessions.label")}</label>
        <input
          value={values.label}
          onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
          placeholder="e.g. L1 生詞"
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-1 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className={`${labelClass} px-1`}>{t("sessions.covers")}</legend>
        {FLAGS.map(({ key, labelKey, Icon }) => (
          <label key={key} className="flex items-center gap-2 py-1 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={values[key] as boolean}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
              className="h-4 w-4 accent-[#0f6e56]"
            />
            <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
            {t(labelKey)}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {t("common.save")}
        </Button>
        {sessionId && (
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("common.delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
