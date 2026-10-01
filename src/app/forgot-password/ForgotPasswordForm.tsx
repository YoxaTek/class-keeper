"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

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
      <div className={f.form}>
        <p className={f.body}>{t("success")}</p>
        <Link href="/login" className={linkClass}>
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  if (step === "password") {
    return (
      <form onSubmit={onResetPassword} className={f.form}>
        <div className={f.field}>
          <label htmlFor="password" className={labelClass}>
            {t("newPassword")}
          </label>
          <div className={f.control}>
            <Lock className={f.iconStart} aria-hidden />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} ${f.padStart}`}
            />
          </div>
        </div>

        <div className={f.field}>
          <label htmlFor="confirmPassword" className={labelClass}>
            {t("confirmPassword")}
          </label>
          <div className={f.control}>
            <Lock className={f.iconStart} aria-hidden />
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} ${f.padStart}`}
            />
          </div>
        </div>

        {error && <p className={f.error}>{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className={f.block}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyEmail} className={f.form}>
      <div className={f.field}>
        <label htmlFor="email" className={labelClass}>
          {tLogin("email")}
        </label>
        <div className={f.control}>
          <Mail className={f.iconStart} aria-hidden />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tLogin("emailPlaceholder")}
            className={`${inputClass} ${f.padStart}`}
          />
        </div>
      </div>

      {error && <p className={f.error}>{error}</p>}

      <Button type="submit" variant="primary" disabled={submitting} className={f.block}>
        {submitting ? t("verifying") : t("continue")}
      </Button>

      <p className={f.muted}>
        <Link href="/login" className={linkClass}>
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
