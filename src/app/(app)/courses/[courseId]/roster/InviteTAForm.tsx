"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRoundPlus } from "lucide-react";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

export function InviteTAForm({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function invite() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "TA", courseId }),
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
    <div className={`${cardClass} ${f.panel}`}>
      <Button type="button" variant="primary" size="sm" onClick={invite} disabled={submitting} className={f.block}>
        <UserRoundPlus size={14} aria-hidden />
        {t("roster.inviteTA")}
      </Button>
      {error && <p className={f.error}>{error}</p>}
      {token && <InviteLinkBox token={token} showQr />}
    </div>
  );
}
