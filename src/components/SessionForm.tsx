"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck2, GraduationCap, Award, Plus, X } from "lucide-react";
import { DateInput } from "@/components/ui/DateInput";
import { inputClass, labelClass, buttonClass, iconDangerClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./SessionForm.module.scss";

export interface AssessmentFormValue {
  /** Present when editing an existing assessment; absent for one just added in this form. */
  id?: string;
  label: string;
  maxScore: number | "";
}

export interface SessionFormValues {
  date: string;
  label: string;
  hasAttendance: boolean;
  hasMidterm: boolean;
  hasFinal: boolean;
  hasFeedback: boolean;
  midtermMaxScore: number | "";
  finalMaxScore: number | "";
  // Any number of each — a session can have e.g. 2 quizzes, not just zero or one.
  quizzes: AssessmentFormValue[];
  assignments: AssessmentFormValue[];
}

// Feedback isn't in this list — unlike the others, it's not an optional
// category a teacher opts into per class; every session always has it
// (see the hardcoded hasFeedback: true below). Quiz/assignment aren't
// here either — they're repeatable lists below, not a single toggle.
const FLAGS: { key: keyof SessionFormValues; labelKey: string; Icon: typeof CalendarCheck2 }[] = [
  { key: "hasAttendance", labelKey: "sessions.attendance", Icon: CalendarCheck2 },
  { key: "hasMidterm", labelKey: "sessions.midterm", Icon: GraduationCap },
  { key: "hasFinal", labelKey: "sessions.final", Icon: Award },
];

const MAX_SCORE_FIELDS: {
  flagKey: "hasMidterm" | "hasFinal";
  maxKey: "midtermMaxScore" | "finalMaxScore";
  labelKey: string;
}[] = [
  { flagKey: "hasMidterm", maxKey: "midtermMaxScore", labelKey: "sessions.midtermMaxScore" },
  { flagKey: "hasFinal", maxKey: "finalMaxScore", labelKey: "sessions.finalMaxScore" },
];

function emptyValues(): SessionFormValues {
  return {
    date: "",
    label: "",
    hasAttendance: true,
    hasMidterm: false,
    hasFinal: false,
    hasFeedback: true,
    midtermMaxScore: 100,
    finalMaxScore: 100,
    quizzes: [],
    assignments: [],
  };
}

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
  const [values, setValues] = useState<SessionFormValues>(initial ?? emptyValues());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmittingChange?.(true);

    const url = sessionId
      ? `/api/courses/${courseId}/sessions/${sessionId}`
      : `/api/courses/${courseId}/sessions`;
    const method = sessionId ? "PATCH" : "POST";

    // A total that was never set (its flag is off) is sent as undefined
    // instead of "" so the API's own default applies. hasFeedback is
    // forced true here too — belt-and-suspenders for a session edited from
    // before feedback stopped being an optional toggle (see FLAGS above).
    const payload = { ...values, hasFeedback: true } as Record<string, unknown>;
    for (const { maxKey } of MAX_SCORE_FIELDS) {
      if (payload[maxKey] === "") payload[maxKey] = undefined;
    }
    payload.quizzes = values.quizzes.map((q) => ({ ...q, maxScore: q.maxScore === "" ? 100 : q.maxScore }));
    payload.assignments = values.assignments.map((a) => ({ ...a, maxScore: a.maxScore === "" ? 100 : a.maxScore }));

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    onSubmittingChange?.(false);
    if (res.ok) onSaved();
  }

  function updateAssessment(
    listKey: "quizzes" | "assignments",
    index: number,
    patch: Partial<AssessmentFormValue>
  ) {
    setValues((v) => ({
      ...v,
      [listKey]: v[listKey].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addAssessment(listKey: "quizzes" | "assignments") {
    setValues((v) => ({ ...v, [listKey]: [...v[listKey], { label: "", maxScore: 100 }] }));
  }

  function removeAssessment(listKey: "quizzes" | "assignments", index: number) {
    setValues((v) => ({ ...v, [listKey]: v[listKey].filter((_, i) => i !== index) }));
  }

  return (
    <form id="session-form" onSubmit={onSubmit}>
      <div className={f.stack}>
        <div className={s.dateRow}>
          <div className={`${f.field} ${f.minW0}`}>
            <label className={labelClass}>{t("common.date")}</label>
            <DateInput value={values.date} onChange={(date) => setValues((v) => ({ ...v, date }))} required />
          </div>

          <div className={f.field}>
            <label className={labelClass}>{t("sessions.label")}</label>
            <input
              value={values.label}
              onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
              placeholder="e.g. L1 生詞"
              className={inputClass}
            />
          </div>
        </div>

        <div className={s.covers}>
          <label className={labelClass}>{t("sessions.covers")}</label>
          <p className={f.hint}>{t("sessions.coversHint")}</p>
          <div className={f.wrap}>
            {FLAGS.map(({ key, labelKey, Icon }) => {
              const active = values[key] as boolean;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [key]: !v[key] }))}
                  aria-pressed={active}
                  className={`${s.chip} ${active ? s.active : ""}`}
                >
                  <Icon size={16} aria-hidden />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {MAX_SCORE_FIELDS.some(({ flagKey }) => values[flagKey]) && (
          <div className={s.maxScores}>
            {MAX_SCORE_FIELDS.filter(({ flagKey }) => values[flagKey]).map(({ maxKey, labelKey }) => (
              <div key={maxKey} className={s.maxScore}>
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

        {/* Side by side while both lists are empty — it's just two "add" buttons,
            no reason to spend two full-width rows on them. The moment either
            list gets a row (label + score + remove control), that's too
            cramped in a half-width column, so both drop to full width. */}
        <div className={`${s.lists} ${values.quizzes.length === 0 && values.assignments.length === 0 ? "" : s.stacked}`}>
          <AssessmentListEditor
            titleKey="sessions.quizzes"
            addLabelKey="sessions.addQuiz"
            maxScoreLabelKey="sessions.quizMaxScore"
            items={values.quizzes}
            onAdd={() => addAssessment("quizzes")}
            onRemove={(i) => removeAssessment("quizzes", i)}
            onChange={(i, patch) => updateAssessment("quizzes", i, patch)}
            t={t}
          />

          <AssessmentListEditor
            titleKey="sessions.assignments"
            addLabelKey="sessions.addAssignment"
            maxScoreLabelKey="sessions.assignmentMaxScore"
            items={values.assignments}
            onAdd={() => addAssessment("assignments")}
            onRemove={(i) => removeAssessment("assignments", i)}
            onChange={(i, patch) => updateAssessment("assignments", i, patch)}
            t={t}
          />
        </div>
      </div>
    </form>
  );
}

// A repeatable list editor shared by quizzes and assignments — a session
// can have any number of each, so this is "add row" / "remove row" rather
// than the single toggle+total the other categories still use.
function AssessmentListEditor({
  titleKey,
  addLabelKey,
  maxScoreLabelKey,
  items,
  onAdd,
  onRemove,
  onChange,
  t,
}: {
  titleKey: string;
  addLabelKey: string;
  maxScoreLabelKey: string;
  items: AssessmentFormValue[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, patch: Partial<AssessmentFormValue>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className={s.editor}>
      <label className={labelClass}>{t(titleKey)}</label>
      <div className={f.stackXs}>
        {items.map((item, i) => (
          <div key={i} className={s.item}>
            <div className={s.itemLabel}>
              <label className={labelClass}>{t("sessions.labelOptional")}</label>
              <input
                value={item.label}
                onChange={(e) => onChange(i, { label: e.target.value })}
                placeholder={`${t(titleKey)} ${i + 1}`}
                className={inputClass}
              />
            </div>
            <div className={s.itemScore}>
              <label className={labelClass}>{t(maxScoreLabelKey)}</label>
              <input
                type="number"
                min={1}
                value={item.maxScore}
                onChange={(e) => onChange(i, { maxScore: e.target.value === "" ? "" : Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              title={t("common.delete")}
              className={iconDangerClass}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className={buttonClass("secondary", "sm")}>
        <Plus size={14} aria-hidden />
        {t(addLabelKey)}
      </button>
    </div>
  );
}
