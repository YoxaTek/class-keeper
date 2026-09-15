"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";

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
        <div className="rounded border border-black/10 bg-black/[.02] p-3 text-sm dark:border-white/10 dark:bg-white/[.03]">
          {t("inviteBanner", { name: invite.invitedByName, role: tRole(invite.role) })}
          {invite.context && <div className="mt-1 font-medium">{invite.context}</div>}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          {t("name")}
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-black/10 px-3 py-2 dark:border-white/20"
        />
      </div>

      {!inviteToken && (
        <div className="space-y-1">
          <label htmlFor="institution" className="block text-sm font-medium">
            {t("institution")} <span className="text-black/40 dark:text-white/40">({t("optional")})</span>
          </label>
          <input
            id="institution"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder={t("institutionPlaceholder")}
            className="w-full rounded border border-black/10 px-3 py-2 dark:border-white/20"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
