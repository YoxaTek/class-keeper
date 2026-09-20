"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { QrScannerButton } from "@/components/QrScanner";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import type { AuthProviderId } from "@/lib/authProviders";

export function LoginForm({ providers, callbackUrl = "/" }: { providers: AuthProviderId[]; callbackUrl?: string }) {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    const result = await signIn("credentials", {
      email,
      password,
      remember: remember ? "true" : "false",
      redirect: false,
    });

    setSubmitting(false);
    if (result?.error) {
      setError(true);
      return;
    }
    // Hard navigation: router.push()+refresh() back-to-back can race (see
    // SessionForm for the full explanation) — a full reload guarantees the
    // dashboard renders with the fresh session.
    window.location.href = callbackUrl;
  }

  const signupHref = callbackUrl === "/" ? "/signup" : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="space-y-5">
      <ProviderSignInButtons providers={providers} callbackUrl={callbackUrl} />

      {providers.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          {t("or")}
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            {t("email")}
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
              placeholder={t("emailPlaceholder")}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={`${inputClass} pl-9 pr-9`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-[#0f6e56] focus:ring-[#0f6e56] dark:border-zinc-700 dark:bg-zinc-900"
            />
            {t("rememberMe")}
          </label>
          <Link href="/forgot-password" className={`text-sm ${linkClass}`}>
            {t("forgotPassword")}
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{t("error")}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full text-base font-bold">
          {t("submit")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {t("noAccount")} <Link href={signupHref} className={linkClass}>{t("createOne")}</Link>
      </p>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <QrScannerButton />
      </div>
    </div>
  );
}
