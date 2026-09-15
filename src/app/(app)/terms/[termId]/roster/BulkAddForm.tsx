"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function BulkAddForm({ termId, remaining }: { termId: string; remaining: number }) {
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

    const res = await fetch(`/api/terms/${termId}/students`, {
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
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="block text-sm font-medium">
        {t("bulkPaste")} <span className="text-black/50 dark:text-white/50">({remaining} left)</span>
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("bulkPastePlaceholder")}
        rows={6}
        className="w-full rounded border border-black/10 px-2 py-1 font-mono text-sm dark:border-white/20"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !text.trim()}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {t("addStudents")}
      </button>
    </form>
  );
}
