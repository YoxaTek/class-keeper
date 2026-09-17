import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getEffectivePlanTier, getEffectiveSubscription } from "@/lib/subscriptions/effectiveSubscription";
import { BillingPlans } from "./BillingPlans";

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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      {checkout === "success" && (
        <p className="rounded-md border border-[#0f6e56]/30 bg-[#0f6e56]/10 px-3 py-2 text-sm text-[#0f6e56] dark:text-teal-400">
          {t("checkoutSuccess")}
        </p>
      )}
      {checkout === "canceled" && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t("checkoutCanceled")}
        </p>
      )}

      <BillingPlans currentTier={currentTier} hasSubscription={hasSubscription} />
    </div>
  );
}
