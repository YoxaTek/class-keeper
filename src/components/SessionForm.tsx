"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck2, HelpCircle, ClipboardList, GraduationCap, Award } from "lucide-react";
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
  quizMaxScore: number | "";
  assignmentMaxScore: number | "";
  midtermMaxScore: number | "";
  finalMaxScore: number | "";
}

const FLAGS: { key: keyof SessionFormValues; labelKey: string; Icon: typeof CalendarCheck2 }[] = [
  { key: "hasAttendance", labelKey: "sessions.attendance", Icon: CalendarCheck2 },
  { key: "hasQuiz", labelKey: "sessions.quiz", Icon: HelpCircle },
  { key: "hasAssignment", labelKey: "sessions.assignment", Icon: ClipboardList },
  { key: "hasMidterm", labelKey: "sessions.midterm", Icon: GraduationCap },
  { key: "hasFinal", labelKey: "sessions.final", Icon: Award },
];

const MAX_SCORE_FIELDS: {
  flagKey: "hasQuiz" | "hasAssignment" | "hasMidterm" | "hasFinal";
  maxKey: "quizMaxScore" | "assignmentMaxScore" | "midtermMaxScore" | "finalMaxScore";
  labelKey: string;
}[] = [
  { flagKey: "hasQuiz", maxKey: "quizMaxScore", labelKey: "sessions.quizMaxScore" },
  { flagKey: "hasAssignment", maxKey: "assignmentMaxScore", labelKey: "sessions.assignmentMaxScore" },
  { flagKey: "hasMidterm", maxKey: "midtermMaxScore", labelKey: "sessions.midtermMaxScore" },
  { flagKey: "hasFinal", maxKey: "finalMaxScore", labelKey: "sessions.finalMaxScore" },
];

export function SessionForm({
  termId,
  sessionId,
  initial,
  onSaved,
  onCancel,
}: {
  termId: string;
  sessionId?: string;
  initial?: SessionFormValues;
  onSaved: () => void;
  onCancel: () => void;
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
      quizMaxScore: 100,
      assignmentMaxScore: 100,
      midtermMaxScore: 100,
      finalMaxScore: 100,
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

    // A total that was never set (its flag is off) is sent as undefined
    // instead of "" so the API's own default applies.
    const payload = { ...values } as Record<string, unknown>;
    for (const { maxKey } of MAX_SCORE_FIELDS) {
      if (payload[maxKey] === "") payload[maxKey] = undefined;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);
    if (res.ok) onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-5">
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>{t("sessions.covers")}</label>
          <div className="flex flex-wrap gap-2">
            {FLAGS.map(({ key, labelKey, Icon }) => {
              const active = values[key] as boolean;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [key]: !v[key] }))}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-[#0f6e56] bg-[#0f6e56]/10 font-medium text-[#0f6e56] dark:text-teal-400"
                      : "border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {MAX_SCORE_FIELDS.some(({ flagKey }) => values[flagKey]) && (
          <div className="flex flex-wrap gap-3">
            {MAX_SCORE_FIELDS.filter(({ flagKey }) => values[flagKey]).map(({ maxKey, labelKey }) => (
              <div key={maxKey} className="w-36 space-y-1">
                <label className={labelClass}>{t(labelKey)}</label>
                <input
                  type="number"
                  min={1}
                  value={values[maxKey]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [maxKey]: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Button type="submit" variant="primary" disabled={submitting}>
          {t("common.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
