"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import type { AuthProviderId } from "@/lib/authProviders";

export function LoginForm({ providers }: { providers: AuthProviderId[] }) {
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
    window.location.href = "/";
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <ProviderSignInButtons providers={providers} />

      <div className="flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        {t("or")}
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-black/10 px-3 py-2 dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-black/10 px-3 py-2 dark:border-white/20"
          />
        </div>

        {error && <p className="text-sm text-red-600">{t("error")}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </form>

      <p className="text-center text-sm text-black/60 dark:text-white/60">
        {t("noAccount")} <Link href="/signup" className="underline">{t("createOne")}</Link>
      </p>
    </div>
  );
}
