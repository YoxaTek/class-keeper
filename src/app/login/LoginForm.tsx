"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import type { AuthProviderId } from "@/lib/authProviders";

export function LoginForm({ providers, callbackUrl = "/" }: { providers: AuthProviderId[]; callbackUrl?: string }) {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    const result = await signIn("credentials", { email, password, redirect: false });

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
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      <ProviderSignInButtons providers={providers} callbackUrl={callbackUrl} />

      <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        {t("or")}
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{t("error")}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {t("submit")}
        </Button>
      </form>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {t("noAccount")} <Link href={signupHref} className={linkClass}>{t("createOne")}</Link>
      </p>
    </div>
  );
}
