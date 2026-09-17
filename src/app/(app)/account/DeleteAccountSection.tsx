"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export function DeleteAccountSection({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const t = useTranslations("account");
  const tLogin = useTranslations("login");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const emailMatches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  async function onDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail, password: hasPassword ? password : undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error === "wrong_password" ? t("wrongPassword") : t("error"));
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

      {hasPassword && (
        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>
            {tLogin("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button
        type="button"
        variant="danger"
        disabled={deleting || !emailMatches || (hasPassword && password === "")}
        onClick={onDelete}
      >
        {deleting ? t("deleting") : t("deleteAccount")}
      </Button>
    </div>
  );
}
