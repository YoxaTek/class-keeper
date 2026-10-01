"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

export function OnboardingForm({ initialName }: { initialName: string }) {
  const t = useTranslations("onboarding");
  const { update } = useSession();

  const [name, setName] = useState(initialName);
  const [institutionName, setInstitutionName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, institutionName: institutionName || undefined }),
    });

    if (res.ok) {
      // (app)/layout.tsx re-checks onboarding status straight from the DB,
      // so update() isn't required for the redirect itself — it keeps
      // role/locale/organizationId in the session cookie fresh so the rest
      // of the app doesn't show stale values until the next sign-in. The
      // hard navigation (not router.push()+refresh()) avoids a race where
      // the two calls back-to-back can end up refreshing the page we're
      // leaving instead of the one we're going to.
      await update().catch(() => {});
      window.location.href = "/";
      return;
    }

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    setError(typeof body?.error === "string" ? body.error : t("genericError"));
  }

  return (
    <form onSubmit={onSubmit} className={f.form}>
      <div className={f.field}>
        <label htmlFor="name" className={labelClass}>
          {t("name")}
        </label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div className={f.field}>
        <label htmlFor="institution" className={labelClass}>
          {t("institution")} <span className={f.optional}>({t("optional")})</span>
        </label>
        <input
          id="institution"
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          placeholder={t("institutionPlaceholder")}
          className={inputClass}
        />
      </div>

      {error && <p className={f.error}>{error}</p>}

      <Button type="submit" variant="primary" disabled={submitting} className={f.block}>
        {t("submit")}
      </Button>
    </form>
  );
}
