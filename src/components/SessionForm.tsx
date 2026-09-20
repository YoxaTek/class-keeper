"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck2, HelpCircle, ClipboardList, GraduationCap, Award, MessageSquareText } from "lucide-react";
import { DateInput } from "@/components/ui/DateInput";
import { inputClass, labelClass } from "@/components/ui/styles";

export interface SessionFormValues {
  date: string;
  label: string;
  hasAttendance: boolean;
  hasQuiz: boolean;
  hasAssignment: boolean;
  hasMidterm: boolean;
  hasFinal: boolean;
  hasFeedback: boolean;
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
  { key: "hasFeedback", labelKey: "sessions.feedback", Icon: MessageSquareText },
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
  courseId,
  sessionId,
  initial,
  onSaved,
  onSubmittingChange,
}: {
  courseId: string;
  sessionId?: string;
  initial?: SessionFormValues;
  onSaved: () => void;
  // The Save button lives in the parent Drawer's pinned footer (not here —
  // see ClassFormDrawer), so its disabled-while-submitting state has to be
  // reported upward instead of just tracked locally.
  onSubmittingChange?: (submitting: boolean) => void;
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
      hasFeedback: false,
      quizMaxScore: 100,
      assignmentMaxScore: 100,
      midtermMaxScore: 100,
      finalMaxScore: 100,
    }
  );
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmittingChange?.(true);

    const url = sessionId
      ? `/api/courses/${courseId}/sessions/${sessionId}`
      : `/api/courses/${courseId}/sessions`;
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

    onSubmittingChange?.(false);
    if (res.ok) onSaved();
  }

  return (
    <form id="session-form" onSubmit={onSubmit}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 space-y-1">
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
    </form>
  );
}
