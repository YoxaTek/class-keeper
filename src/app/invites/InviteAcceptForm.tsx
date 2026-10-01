"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import f from "@/components/ui/form.module.scss";

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
    <div className={f.form}>
      <div className={f.infoBox}>
        {t("inviteBanner", { name: invite.invitedByName, role: tRole(invite.role) })}
        {invite.context && <div className={f.infoStrong}>{invite.context}</div>}
      </div>

      {error && <p className={f.error}>{error}</p>}

      <Button type="button" variant="primary" onClick={onAccept} disabled={submitting} className={f.block}>
        {t("accept")}
      </Button>
    </div>
  );
}
