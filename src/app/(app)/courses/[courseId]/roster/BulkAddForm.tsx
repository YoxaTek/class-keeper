"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, cardClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./bulkAdd.module.scss";

export function BulkAddForm({ courseId }: { courseId: string }) {
  const t = useTranslations("roster");
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const names = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const res = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });

    setSubmitting(false);
    if (res.ok) {
      setText("");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not add students.");
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} ${f.panel}`}>
      <label className={labelClass}>{t("bulkPaste")}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("bulkPastePlaceholder")}
        rows={6}
        className={`${inputClass} ${s.names}`}
      />
      {error && <p className={f.error}>{error}</p>}
      <Button type="submit" variant="primary" size="sm" disabled={submitting || !text.trim()}>
        <UserPlus size={14} aria-hidden />
        {t("addStudents")}
      </Button>
    </form>
  );
}
