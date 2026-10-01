"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./EvaluationForm.module.scss";

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
    <div className={f.stackSm}>
      <div className={f.field}>
        <label className={labelClass}>{t("narrative")}</label>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>
      <div className={f.field}>
        <label className={labelClass}>
          {t("impressionScore")} <span className={f.optional}>/ {maxImpressionScore}</span>
        </label>
        <input
          type="number"
          value={impressionScore}
          onChange={(e) => setImpressionScore(e.target.value)}
          className={`${inputClass} ${s.score}`}
        />
      </div>
      <Button variant="primary" size="sm" onClick={save} disabled={saving}>
        {tc("save")}
      </Button>
    </div>
  );
}
