"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import type { AuthProviderId } from "@/lib/authProviders";

export function SignupForm({ providers, callbackUrl = "/" }: { providers: AuthProviderId[]; callbackUrl?: string }) {
  const t = useTranslations("signup");
  const tLogin = useTranslations("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("error"));
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (result?.error) {
      setError(t("error"));
      return;
    }
    // Hard navigation: see LoginForm for why (router.push()+refresh() can
    // race and render the dashboard with a stale, unauthenticated session).
    window.location.href = callbackUrl;
  }

  const loginHref = callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="space-y-5">
      <ProviderSignInButtons providers={providers} callbackUrl={callbackUrl} />

      <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        {tLogin("or")}
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className={labelClass}>
            {t("name")}
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            {tLogin("email")}
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
            {tLogin("password")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {t("submit")}
        </Button>
      </form>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {t("haveAccount")} <Link href={loginHref} className={linkClass}>{tLogin("submit")}</Link>
      </p>
    </div>
  );
}
