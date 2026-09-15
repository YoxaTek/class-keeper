"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { Subject } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { inputClass, inputClassSm, labelClass, cardClass } from "@/components/ui/styles";

const NEW_SUBJECT = "__new__";

export function TermCreateForm({ subjects }: { subjects: Subject[] }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
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
  const [studentNames, setStudentNames] = useState("");
  const [error, setError] = useState<string | null>(null);

  function updateWeight(key: keyof typeof weights, value: number) {
    setWeights((w) => ({ ...w, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not create the term.");
      return;
    }

    const term = await res.json();
    const names = studentNames
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let studentsError: string | null = null;
    if (names.length > 0) {
      const studentsRes = await fetch(`/api/terms/${term.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      if (!studentsRes.ok) {
        const body = await studentsRes.json().catch(() => null);
        // The term itself was created successfully — surface the roster
        // issue but don't roll back or block; they can add students from
        // the Roster tab instead.
        studentsError = typeof body?.error === "string" ? body.error : "Term created, but couldn't add students.";
      }
    }

    setSubmitting(false);
    router.refresh();
    if (studentsError) {
      setError(studentsError);
    } else {
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("newTerm")}
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-4 p-4`}>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("createTitle")}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>{t("subject")}</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputClass}>
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
              className={`${inputClass} mt-1`}
            />
          )}
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

        <div className="space-y-1">
          <label className={labelClass}>{t("startDate")}</label>
          <DateInput value={startDate} onChange={setStartDate} required />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>{t("endDate")}</label>
          <DateInput value={endDate} onChange={setEndDate} required />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>{t("midtermMaxScore")}</label>
          <input
            type="number"
            value={midtermMaxScore}
            onChange={(e) => setMidtermMaxScore(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>{t("maxExcusedAbsences")}</label>
          <input
            type="number"
            value={maxExcusedAbsences}
            onChange={(e) => setMaxExcusedAbsences(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>{t("passingScore")}</label>
          <input
            type="number"
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <legend className={`${labelClass} mb-1`}>{t("weights")}</legend>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
            <div key={key} className="space-y-1">
              <label className={labelClass}>{t(key)}</label>
              <input
                type="number"
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className={inputClassSm}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <label className={labelClass}>{t("addStudentsWhileCreating")}</label>
        <textarea
          value={studentNames}
          onChange={(e) => setStudentNames(e.target.value)}
          placeholder={t("addStudentsPlaceholder")}
          rows={4}
          className={`${inputClass} font-mono`}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {tc("save")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
