import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getEnabledProviders } from "@/lib/authProviders";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { AuthShell } from "@/components/AuthShell";

export default async function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  const onboardingUrl = `/onboarding?invite=${encodeURIComponent(token)}`;
  if (session) redirect(onboardingUrl);

  const t = await getTranslations("invite");
  const tCommon = await getTranslations("common");
  const providers = getEnabledProviders();

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>
        <ProviderSignInButtons providers={providers} callbackUrl={onboardingUrl} />
      </div>
    </AuthShell>
  );
}
