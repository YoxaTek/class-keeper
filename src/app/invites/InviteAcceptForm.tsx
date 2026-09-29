"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";

interface InviteContext {
  role: Role;
  invitedByName: string;
  context: string;
}

export function InviteAcceptForm({ token, invite }: { token: string; invite: InviteContext }) {
  const t = useTranslations("invites");
  const tRole = useTranslations("common.role");
  const { update } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      // Keeps role/onboardingComplete fresh in the session cookie for the
      // rest of the app — see OnboardingForm for the full reasoning behind
      // the hard navigation that follows instead of router.push()+refresh().
      await update().catch(() => {});
      window.location.href = "/";
      return;
    }

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    setError(typeof body?.error === "string" ? body.error : t("genericError"));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {t("inviteBanner", { name: invite.invitedByName, role: tRole(invite.role) })}
        {invite.context && <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{invite.context}</div>}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="button" variant="primary" onClick={onAccept} disabled={submitting} className="w-full">
        {t("accept")}
      </Button>
    </div>
  );
}
