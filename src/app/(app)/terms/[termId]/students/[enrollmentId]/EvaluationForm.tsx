"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function EvaluationForm({
  enrollmentId,
  initialNarrative,
  initialImpressionScore,
  maxImpressionScore,
}: {
  termId: string;
  enrollmentId: string;
  initialNarrative: string;
  initialImpressionScore: number | null;
  maxImpressionScore: number;
}) {
  const t = useTranslations("studentDetail");
  const tc = useTranslations("common");
  const router = useRouter();
  const [narrative, setNarrative] = useState(initialNarrative);
  const [impressionScore, setImpressionScore] = useState(initialImpressionScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/enrollments/${enrollmentId}/evaluation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        narrative: narrative || null,
        impressionScore: impressionScore === "" ? null : Number(impressionScore),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm">{t("narrative")}</label>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm">
          {t("impressionScore")} <span className="text-black/50 dark:text-white/50">/ {maxImpressionScore}</span>
        </label>
        <input
          type="number"
          value={impressionScore}
          onChange={(e) => setImpressionScore(e.target.value)}
          className="w-24 rounded border border-black/10 px-2 py-1 dark:border-white/20"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {tc("save")}
      </button>
    </div>
  );
}
