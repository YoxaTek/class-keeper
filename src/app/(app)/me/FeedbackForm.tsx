"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, MessageSquarePlus, Pencil } from "lucide-react";
import type { Feedback } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./me.module.scss";

export function FeedbackForm({ enrollmentId, existing }: { enrollmentId: string; existing: Feedback | null }) {
  const t = useTranslations("studentView");
  const tc = useTranslations("common");
  const [submitted, setSubmitted] = useState(existing);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [editing, setEditing] = useState(!existing);
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
      setEditing(false);
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not submit feedback.");
    }
  }

  if (submitted && !editing) {
    return (
      <div className={f.stackXs}>
        <div className={s.sent}>
          <CircleCheck size={16} aria-hidden />
          <div>
            <h3 className={f.subheading}>{t("feedback")}</h3>
            <p className={f.muted}>
              {t("feedbackSubmitted", { date: new Date(submitted.submittedAt).toLocaleDateString() })}
            </p>
          </div>
        </div>
        <p className={s.comment}>{submitted.comment}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)} className={s.edit}>
          <Pencil size={14} aria-hidden />
          {t("feedbackEdit")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={f.stackXs}>
      <h3 className={f.subheading}>{t("feedback")}</h3>
      <textarea
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        rows={4}
        className={inputClass}
      />
      {error && <p className={f.error}>{error}</p>}
      <div className={f.actions}>
        {submitted && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setComment(submitted.comment);
              setError(null);
              setEditing(false);
            }}
          >
            {tc("cancel")}
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          <MessageSquarePlus size={14} aria-hidden />
          {submitted ? t("feedbackUpdate") : t("feedbackSubmit")}
        </Button>
      </div>
    </form>
  );
}
