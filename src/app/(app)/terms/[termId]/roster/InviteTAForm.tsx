"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InviteLinkBox } from "@/components/InviteLinkBox";

export function InviteTAForm({ termId }: { termId: string }) {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "TA", termId, email: email || undefined }),
    });

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setToken(body.token);
    } else {
      setError(typeof body?.error === "string" ? body.error : t("onboarding.genericError"));
    }
  }

  return (
    <div className="space-y-2 rounded border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-medium">{t("roster.inviteTA")}</h3>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="ta-email" className="block text-xs">
            {t("roster.inviteTAEmail")}
          </label>
          <input
            id="ta-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-black/10 px-2 py-1 text-sm dark:border-white/20"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {t("roster.inviteTA")}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {token && (
        <div className="max-w-sm">
          <InviteLinkBox token={token} />
        </div>
      )}
    </div>
  );
}
