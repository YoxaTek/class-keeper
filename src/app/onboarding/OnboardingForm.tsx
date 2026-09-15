"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";

interface InviteContext {
  role: Role;
  invitedByName: string;
  context: string;
}

export function OnboardingForm({
  initialName,
  inviteToken,
  invite,
}: {
  initialName: string;
  inviteToken?: string;
  invite: InviteContext | null;
}) {
  const t = useTranslations("onboarding");
  const tRole = useTranslations("common.role");
  const { update } = useSession();

  const [name, setName] = useState(initialName);
  const [institutionName, setInstitutionName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        inviteToken,
        ...(inviteToken ? {} : { institutionName: institutionName || undefined }),
      }),
    });

    if (res.ok) {
      // (app)/layout.tsx re-checks onboarding status straight from the DB,
      // so update() isn't required for the redirect itself — it keeps
      // role/locale/organizationId in the session cookie fresh so the rest
      // of the app doesn't show stale values until the next sign-in. The
      // hard navigation (not router.push()+refresh()) avoids a race where
      // the two calls back-to-back can end up refreshing the page we're
      // leaving instead of the one we're going to.
      await update().catch(() => {});
      window.location.href = "/";
      return;
    }

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    setError(typeof body?.error === "string" ? body.error : t("genericError"));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {invite && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          {t("inviteBanner", { name: invite.invitedByName, role: tRole(invite.role) })}
          {invite.context && <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{invite.context}</div>}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          {t("name")}
        </label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      {!inviteToken && (
        <div className="space-y-1">
          <label htmlFor="institution" className={labelClass}>
            {t("institution")} <span className="text-zinc-400 dark:text-zinc-600">({t("optional")})</span>
          </label>
          <input
            id="institution"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder={t("institutionPlaceholder")}
            className={inputClass}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="primary" disabled={submitting} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
