"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";

export function JoinForm({ termId, initialName }: { termId: string; initialName: string }) {
  const t = useTranslations("join");
  const [name, setName] = useState(initialName);
  const [chineseName, setChineseName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/terms/${termId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, chineseName: chineseName || undefined, studentId }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("error"));
      return;
    }
    // Hard navigation so the freshly updated role/onboarding state (set
    // server-side by the join) is reflected immediately — same reasoning
    // as LoginForm's post-submit redirect.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/me";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          {t("name")}
        </label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="chineseName" className={labelClass}>
          {t("chineseName")}
        </label>
        <input
          id="chineseName"
          value={chineseName}
          onChange={(e) => setChineseName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="studentId" className={labelClass}>
          {t("studentId")}
        </label>
        <input
          id="studentId"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="primary" disabled={submitting} className="w-full">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
