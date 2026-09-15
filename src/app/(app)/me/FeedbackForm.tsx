"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Feedback } from "@prisma/client";

export function FeedbackForm({ enrollmentId, existing }: { enrollmentId: string; existing: Feedback | null }) {
  const t = useTranslations("studentView");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(existing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, comment }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSubmitted(await res.json());
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not submit feedback.");
    }
  }

  if (submitted) {
    return (
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("feedback")}</h3>
        <p className="text-sm text-black/60 dark:text-white/60">
          {t("feedbackSubmitted", { date: new Date(submitted.submittedAt).toLocaleDateString() })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <h3 className="text-sm font-medium">{t("feedback")}</h3>
      <textarea
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        rows={4}
        className="w-full rounded border border-black/10 px-2 py-1 dark:border-white/20"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {t("feedbackSubmit")}
      </button>
    </form>
  );
}
