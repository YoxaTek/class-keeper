"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRoundPlus } from "lucide-react";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, cardClass } from "@/components/ui/styles";

export function InviteCoTeacherForm() {
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
      body: JSON.stringify({ role: "TEACHER", email: email || undefined }),
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
    <div className={`${cardClass} max-w-sm space-y-2 p-4`}>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("dashboard.inviteCoTeacher")}</h3>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1">
          <label htmlFor="co-teacher-email" className={labelClass}>
            {t("roster.inviteTAEmail")}
          </label>
          <input
            id="co-teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" variant="primary" disabled={submitting}>
          <UserRoundPlus className="h-4 w-4" aria-hidden />
          {t("dashboard.inviteCoTeacher")}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {token && <InviteLinkBox token={token} />}
    </div>
  );
}
