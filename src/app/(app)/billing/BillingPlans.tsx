"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { PlanTier } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/styles";
import { PLAN_LIMITS } from "@/lib/subscriptions/planLimits";
import f from "@/components/ui/form.module.scss";
import s from "./billing.module.scss";

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
      {error && <p className={f.error}>{error}</p>}

      <div className={s.plans}>
        {TIERS.map((tier) => {
          const isCurrent = tier === currentTier;
          return (
            <div key={tier} className={`${cardClass} ${s.plan}`}>
              <div>
                <h2 className={f.subheading}>{t(`plan.${tier}`)}</h2>
                {isCurrent && (
                  <span className={s.current}>
                    {t("currentPlan")}
                  </span>
                )}
              </div>

              <ul className={s.features}>
                {features(tier).map((feature) => (
                  <li key={feature}>
                    <Check size={14} aria-hidden />
                    {feature}
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
