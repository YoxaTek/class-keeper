"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./account.module.scss";

export function DeleteAccountSection({ email }: { email: string }) {
  const t = useTranslations("account");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const emailMatches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  async function onDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    });

    if (!res.ok) {
        setError(t("error"));
      setDeleting(false);
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className={`${cardClass} ${s.danger}`}>
      <div className={f.field}>
        <h2 className={s.dangerTitle}>{t("deleteAccount")}</h2>
        <p className={f.muted}>{t("deleteWarning")}</p>
      </div>

      <div className={f.field}>
        <label htmlFor="confirmEmail" className={labelClass}>
          {t("confirmEmailLabel", { email })}
        </label>
        <input
          id="confirmEmail"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {error && <p className={f.error}>{error}</p>}

      <Button
        type="button"
        variant="danger"
        disabled={deleting || !emailMatches}
        onClick={onDelete}
      >
        {deleting ? t("deleting") : t("deleteAccount")}
      </Button>
    </div>
  );
}
