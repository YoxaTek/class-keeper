"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

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
    <div className={`${cardClass} space-y-4 border-red-200 p-4 dark:border-red-900`}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">{t("deleteAccount")}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("deleteWarning")}</p>
      </div>

      <div className="space-y-1">
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
