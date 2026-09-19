"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Drawer } from "@/components/ui/Drawer";
import { inputClass, inputClassSm, labelClass } from "@/components/ui/styles";

const sliderClass =
  "themed-slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700";

function sliderFillStyle(value: number, min: number, max: number) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = ((clamped - min) / (max - min || 1)) * 100;
  return {
    background:
      `linear-gradient(to right, ` +
      `var(--slider-track-filled) 0%, var(--slider-track-filled) ${pct}%, ` +
      `var(--slider-track-empty) ${pct}%, var(--slider-track-empty) 100%)`,
  };
}

interface TermFields {
  subjectName: string;
  name: string;
  startDate: string;
  endDate: string;
  weightAttendance: number;
  weightAssignment: number;
  weightQuiz: number;
  weightMidterm: number;
  weightFinal: number;
  weightImpression: number;
  maxExcusedAbsences: number;
  passingScore: number;
  institute: string;
}

type Props = { mode: "create" } | { mode: "edit"; termId: string; initial: TermFields };

export function TermFormDrawer(props: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initial: TermFields =
    props.mode === "edit"
      ? props.initial
      : {
          subjectName: "",
          name: "",
          startDate: "",
          endDate: "",
          weightAttendance: 15,
          weightAssignment: 15,
          weightQuiz: 30,
          weightMidterm: 15,
          weightFinal: 15,
          weightImpression: 10,
          maxExcusedAbsences: 3,
          passingScore: 70,
          institute: "",
        };

  const [subjectName, setSubjectName] = useState(initial.subjectName);
  const [name, setName] = useState(initial.name);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [weights, setWeights] = useState({
    weightAttendance: initial.weightAttendance,
    weightAssignment: initial.weightAssignment,
    weightQuiz: initial.weightQuiz,
    weightMidterm: initial.weightMidterm,
    weightFinal: initial.weightFinal,
    weightImpression: initial.weightImpression,
  });
  const [maxExcusedAbsences, setMaxExcusedAbsences] = useState(initial.maxExcusedAbsences);
  const [passingScore, setPassingScore] = useState(initial.passingScore);
  const [institute, setInstitute] = useState(initial.institute);
  const [error, setError] = useState<string | null>(null);
  const dateRangeError =
    startDate && endDate && endDate < startDate ? "End date must be on or after start date." : null;
  const weightTotal = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const weightError = weightTotal !== 100 ? `Grading weights must add up to 100 (currently ${weightTotal}).` : null;

  function updateWeight(key: keyof typeof weights, value: number) {
    setWeights((w) => ({ ...w, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (dateRangeError || weightError) {
      setSubmitting(false);
      setError(dateRangeError ?? weightError);
      return;
    }

    const url = props.mode === "edit" ? `/api/terms/${props.termId}` : "/api/terms";
    const res = await fetch(url, {
      method: props.mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subjectName,
        startDate,
        endDate,
        maxExcusedAbsences,
        passingScore,
        institute: institute.trim() || null,
        ...weights,
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not save the term.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    if (props.mode === "edit") {
      return (
        <button
          onClick={() => setOpen(true)}
          title={tc("edit")}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      );
    }
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("newTerm")}
      </Button>
    );
  }

  return (
    <Drawer
      title={props.mode === "edit" ? t("editTitle") : t("createTitle")}
      onClose={() => setOpen(false)}
      footer={
        <div className="flex gap-2">
          <Button type="submit" form="term-form" variant="primary" disabled={submitting || !!dateRangeError || !!weightError}>
            {tc("save")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
        </div>
      }
    >
      <form id="term-form" onSubmit={onSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>{t("subject")}</label>
              <input
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Chinese — Basic"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{t("term")}</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 114-2"
                className={inputClass}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <label className={labelClass}>{t("startDate")}</label>
              <DateInput value={startDate} onChange={setStartDate} max={endDate || undefined} required />
            </div>

            <div className="min-w-0 space-y-1">
              <label className={labelClass}>{t("endDate")}</label>
              <DateInput value={endDate} onChange={setEndDate} min={startDate || undefined} required />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{t("maxExcusedAbsences")}</label>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={maxExcusedAbsences}
                onChange={(e) => setMaxExcusedAbsences(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{t("passingScore")}</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className={labelClass}>{t("institute")}</label>
              <input
                value={institute}
                onChange={(e) => setInstitute(e.target.value)}
                placeholder={t("institutePlaceholder")}
                className={inputClass}
              />
            </div>
          </div>

          <fieldset className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <legend className={`${labelClass} mb-1 flex items-center gap-2`}>
              {t("weights")}
              <span className={weightError ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}>
                ({weightTotal}/100)
              </span>
            </legend>
            <div className="space-y-2">
              {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
                <div key={key} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-2">
                  <label className={labelClass}>{t(key)}</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[key]}
                    onChange={(e) => updateWeight(key, Number(e.target.value))}
                    className={sliderClass}
                    style={sliderFillStyle(weights[key], 0, 100)}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={weights[key]}
                      onChange={(e) => updateWeight(key, Number(e.target.value))}
                      className={`${inputClassSm} tabular pr-5`}
                    />
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {(dateRangeError ?? weightError ?? error) && (
            <p className="text-sm text-red-600 dark:text-red-400">{dateRangeError ?? weightError ?? error}</p>
          )}
        </div>
      </form>
    </Drawer>
  );
}
