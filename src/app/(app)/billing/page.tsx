import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getEffectivePlanTier, getEffectiveSubscription } from "@/lib/subscriptions/effectiveSubscription";
import { BillingPlans } from "./BillingPlans";
import s from "./billing.module.scss";
import f from "@/components/ui/form.module.scss";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "TEACHER") redirect("/");

  const t = await getTranslations("billing");
  const { checkout } = await searchParams;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: {
      organizationId: true,
      subscription: { select: { tier: true, status: true } },
      organization: { select: { subscription: { select: { tier: true, status: true } } } },
    },
  });
  const currentTier = getEffectivePlanTier(user);
  const hasSubscription = getEffectiveSubscription(user) !== null;

  return (
    <div className={s.page}>
      <h1 className={f.pageTitle}>{t("title")}</h1>

      {checkout === "success" && (
        <p className={`${s.notice} ${s.success}`}>
          {t("checkoutSuccess")}
        </p>
      )}
      {checkout === "canceled" && (
        <p className={s.notice}>
          {t("checkoutCanceled")}
        </p>
      )}

      <BillingPlans currentTier={currentTier} hasSubscription={hasSubscription} />
    </div>
  );
}
