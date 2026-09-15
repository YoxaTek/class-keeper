"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, MessageSquarePlus } from "lucide-react";
import type { Feedback } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";

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
      <div className="flex items-start gap-2">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f6e56] dark:text-teal-400" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("feedback")}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {t("feedbackSubmitted", { date: new Date(submitted.submittedAt).toLocaleDateString() })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("feedback")}</h3>
      <textarea
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        rows={4}
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" variant="primary" size="sm" disabled={submitting}>
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
        {t("feedbackSubmit")}
      </Button>
    </form>
  );
}
