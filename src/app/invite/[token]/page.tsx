import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  const onboardingUrl = `/onboarding?invite=${encodeURIComponent(token)}`;
  if (session) redirect(onboardingUrl);

  const t = await getTranslations("invite");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{t("subtitle")}</p>
        <GoogleSignInButton callbackUrl={onboardingUrl} />
      </div>
    </div>
  );
}
