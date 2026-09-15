"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Subject } from "@prisma/client";

const NEW_SUBJECT = "__new__";

export function TermCreateForm({ subjects }: { subjects: Subject[] }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? NEW_SUBJECT);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weights, setWeights] = useState({
    weightAttendance: 15,
    weightAssignment: 15,
    weightQuiz: 30,
    weightMidterm: 15,
    weightFinal: 15,
    weightImpression: 10,
  });
  const [midtermMaxScore, setMidtermMaxScore] = useState(100);
  const [maxExcusedAbsences, setMaxExcusedAbsences] = useState(3);
  const [passingScore, setPassingScore] = useState(70);

  function updateWeight(key: keyof typeof weights, value: number) {
    setWeights((w) => ({ ...w, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ...(subjectId === NEW_SUBJECT ? { newSubjectName } : { subjectId }),
        startDate,
        endDate,
        midtermMaxScore,
        maxExcusedAbsences,
        passingScore,
        ...weights,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
        {t("newTerm")}
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded border border-black/10 p-4 dark:border-white/10">
      <h2 className="font-medium">{t("createTitle")}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm">{t("subject")}</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_SUBJECT}>+ New subject…</option>
          </select>
          {subjectId === NEW_SUBJECT && (
            <input
              required
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="e.g. Chinese — Basic"
              className="mt-1 w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("term")}</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 114-2"
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("startDate")}</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("endDate")}</label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("midtermMaxScore")}</label>
          <input
            type="number"
            value={midtermMaxScore}
            onChange={(e) => setMidtermMaxScore(Number(e.target.value))}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("maxExcusedAbsences")}</label>
          <input
            type="number"
            value={maxExcusedAbsences}
            onChange={(e) => setMaxExcusedAbsences(Number(e.target.value))}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">{t("passingScore")}</label>
          <input
            type="number"
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("weights")}</legend>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
            <div key={key} className="space-y-1">
              <label className="block text-xs">{t(key)}</label>
              <input
                type="number"
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
