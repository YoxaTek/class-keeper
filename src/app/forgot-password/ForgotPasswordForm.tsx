"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const tLogin = useTranslations("login");
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/reset-password/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);
    if (res.ok) {
      setStep("password");
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("emailNotFound"));
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("mismatch"));
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);
    if (res.ok) {
      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("error"));
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{t("success")}</p>
        <Link href="/login" className={linkClass}>
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  if (step === "password") {
    return (
      <form onSubmit={onResetPassword} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>
            {t("newPassword")}
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              aria-hidden
            />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className={labelClass}>
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              aria-hidden
            />
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyEmail} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          {tLogin("email")}
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            aria-hidden
          />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tLogin("emailPlaceholder")}
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="primary" disabled={submitting} className="w-full">
        {submitting ? t("verifying") : t("continue")}
      </Button>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        <Link href="/login" className={linkClass}>
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
