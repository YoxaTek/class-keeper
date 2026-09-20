"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { PlanTier } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/styles";
import { PLAN_LIMITS } from "@/lib/subscriptions/planLimits";

const TIERS: PlanTier[] = ["FREE", "PRO", "INSTITUTION"];

// Outside the component so the compiler doesn't have to trace this mutation
// through the per-card closures upgrade() is called from.
function redirectTo(url: string) {
  window.location.href = url;
}

export function BillingPlans({
  currentTier,
  hasSubscription,
}: {
  currentTier: PlanTier;
  hasSubscription: boolean;
}) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState<PlanTier | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(tier: "PRO" | "INSTITUTION") {
    setLoading(tier);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      setError(typeof data?.error === "string" ? data.error : t("error"));
      setLoading(null);
      return;
    }
    redirectTo(data.url);
  }

  async function manageBilling() {
    setLoading("portal");
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      setError(typeof data?.error === "string" ? data.error : t("error"));
      setLoading(null);
      return;
    }
    redirectTo(data.url);
  }

  function features(tier: PlanTier): string[] {
    const { maxActiveCourses, maxTAs } = PLAN_LIMITS[tier];
    return [
      maxActiveCourses === null ? t("unlimitedCourses") : t("limitedCourses", { count: maxActiveCourses }),
      maxTAs === null
        ? tier === "INSTITUTION"
          ? t("unlimitedTAsPooled")
          : t("unlimitedTAs")
        : maxTAs === 0
          ? t("noTAs")
          : t("limitedTAs", { count: maxTAs }),
    ];
  }

  return (
    <>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = tier === currentTier;
          return (
            <div key={tier} className={`${cardClass} flex flex-col gap-3 p-4`}>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t(`plan.${tier}`)}</h2>
                {isCurrent && (
                  <span className="mt-1 inline-block rounded-full bg-[#0f6e56]/10 px-2 py-0.5 text-xs font-medium text-[#0f6e56] dark:text-teal-400">
                    {t("currentPlan")}
                  </span>
                )}
              </div>

              <ul className="flex-1 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {features(tier).map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f6e56] dark:text-teal-400" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              {tier !== "FREE" && !isCurrent && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading !== null}
                  onClick={() => upgrade(tier as "PRO" | "INSTITUTION")}
                >
                  {loading === tier ? t("redirecting") : t("upgrade")}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {hasSubscription && (
        <Button type="button" variant="secondary" disabled={loading !== null} onClick={manageBilling}>
          {loading === "portal" ? t("redirecting") : t("manageBilling")}
        </Button>
      )}
    </>
  );
}
