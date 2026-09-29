"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, linkClass } from "@/components/ui/styles";
import type { AuthProviderId } from "@/lib/authProviders";

export function SignupForm({ providers, callbackUrl = "/", initialInstitution = "" }: { providers: AuthProviderId[]; callbackUrl?: string; initialInstitution?: string }) {
  const t = useTranslations("signup");
  const tLogin = useTranslations("login");
  const tOnboarding = useTranslations("onboarding");
  const tJoin = useTranslations("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionName, setInstitutionName] = useState(initialInstitution);
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A course-join link (e.g. from a scanned QR code, or a teacher's join
  // link) carries its course as ?course= inside callbackUrl once it's been
  // routed through /invites — the only case where a Student ID means
  // anything at signup. Everything else is a plain (or TA/co-teacher
  // invite) signup, which always creates a TEACHER account. Institute is
  // always offered, prefilled from the linked course when it has one.
  const isInviteFlow = callbackUrl.startsWith("/invites");
  const joinCourseId = isInviteFlow ? callbackUrl.match(/[?&]course=([^&]+)/)?.[1] : undefined;
  const showStudentId = !!joinCourseId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        ...(institutionName ? { institutionName } : {}),
      }),
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

    // /api/signup already finishes onboarding (name + institution, when
    // given) in the same request — nothing left to prefill on a later
    // page. Student ID is the one value with nowhere to go yet (joining a
    // specific course isn't something /api/signup can do), so that's still
    // carried forward onto callbackUrl for the join form to pick up.
    let destination = callbackUrl;
    if (showStudentId && studentId) {
      const separator = callbackUrl.includes("?") ? "&" : "?";
      destination = `${callbackUrl}${separator}studentId=${encodeURIComponent(studentId)}`;
    }

    // Hard navigation: see LoginForm for why (router.push()+refresh() can
    // race and render the dashboard with a stale, unauthenticated session).
    window.location.href = destination;
  }

  const loginHref = callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="space-y-5">
      <ProviderSignInButtons providers={providers} callbackUrl={callbackUrl} />

      {providers.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          {tLogin("or")}
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

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

        {(
          <div className="space-y-1">
            <label htmlFor="institution" className={labelClass}>
              {tOnboarding("institution")}{" "}
              <span className="text-zinc-400 dark:text-zinc-600">({tOnboarding("optional")})</span>
            </label>
            <input
              id="institution"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder={tOnboarding("institutionPlaceholder")}
              className={inputClass}
            />
          </div>
        )}

        {showStudentId && (
          <div className="space-y-1">
            <label htmlFor="studentId" className={labelClass}>
              {tJoin("studentId")} <span className="text-zinc-400 dark:text-zinc-600">({tOnboarding("optional")})</span>
            </label>
            <input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

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
