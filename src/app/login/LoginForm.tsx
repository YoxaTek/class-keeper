"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { InstallLink } from "@/components/InstallLink";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { QrScannerButton } from "@/components/QrScanner";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import type { AuthProviderId } from "@/lib/authProviders";
import f from "@/components/ui/form.module.scss";
import s from "./login.module.scss";

export function LoginForm({
  providers,
  callbackUrl = "/",
  hideQrScan = false,
}: {
  providers: AuthProviderId[];
  callbackUrl?: string;
  hideQrScan?: boolean;
}) {
  const t = useTranslations("login");
  const tInstall = useTranslations("install");
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
    <div className={f.stack}>
      <ProviderSignInButtons providers={providers} callbackUrl={callbackUrl} />

      {providers.length > 0 && (
        <div className={f.divider}>
          {t("or")}
        </div>
      )}

      <form onSubmit={onSubmit} className={f.form}>
        <div className={f.field}>
          <label htmlFor="email" className={labelClass}>
            {t("email")}
          </label>
          <div className={f.control}>
            <Mail className={f.iconStart} aria-hidden />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={`${inputClass} ${f.padStart}`}
            />
          </div>
        </div>

        <div className={f.field}>
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <div className={f.control}>
            <Lock className={f.iconStart} aria-hidden />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={`${inputClass} ${f.padBoth}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className={f.iconEnd}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        <div className={f.rowBetween}>
          <label className={f.checkLabel}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className={f.checkbox}
            />
            {t("rememberMe")}
          </label>
          <Link href="/forgot-password" className={linkClass}>
            {t("forgotPassword")}
          </Link>
        </div>

        {error && <p className={f.error}>{t("error")}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className={`${f.block} ${s.submit}`}>
          {t("submit")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </form>

      <p className={f.muted}>
        {t("noAccount")} <Link href={signupHref} className={linkClass}>{t("createOne")}</Link>
      </p>

      <p className={f.muted}>
        <InstallLink className={linkClass}>{tInstall("link")}</InstallLink>
      </p>

      {!hideQrScan && (
        <div className={s.qr}>
          <QrScannerButton triggerLabel={t("scanQr")} title={t("scanQrTitle")} helpText={t("scanQrHelp")} />
        </div>
      )}
    </div>
  );
}
