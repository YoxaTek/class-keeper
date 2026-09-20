"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";

export function EvaluationForm({
  enrollmentId,
  initialNarrative,
  initialImpressionScore,
  maxImpressionScore,
}: {
  courseId: string;
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
        <label className={labelClass}>{t("narrative")}</label>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>
          {t("impressionScore")} <span className="text-zinc-400 dark:text-zinc-600">/ {maxImpressionScore}</span>
        </label>
        <input
          type="number"
          value={impressionScore}
          onChange={(e) => setImpressionScore(e.target.value)}
          className={`${inputClass} w-24`}
        />
      </div>
      <Button variant="primary" size="sm" onClick={save} disabled={saving}>
        {tc("save")}
      </Button>
    </div>
  );
}
