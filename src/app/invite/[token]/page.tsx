import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getEnabledProviders } from "@/lib/authProviders";
import { tryAcceptAdditionalTaCourse } from "@/lib/invites";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";

export default async function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  const onboardingUrl = `/onboarding?invite=${encodeURIComponent(token)}`;
  if (session) {
    // An existing TA picking up another course has nothing left to fill
    // out — apply it now and skip /onboarding entirely. Any other case
    // (new account, or a real role change) still goes through onboarding
    // so it can show the right form or error.
    const applied = await tryAcceptAdditionalTaCourse(session.user.id, session.user.email!, token);
    redirect(applied ? "/" : onboardingUrl);
  }

  const t = await getTranslations("invite");
  const tCommon = await getTranslations("common");
  const tLogin = await getTranslations("login");
  const tSignup = await getTranslations("signup");
  const providers = getEnabledProviders();
  const callbackParam = `callbackUrl=${encodeURIComponent(onboardingUrl)}`;

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>
        <ProviderSignInButtons providers={providers} callbackUrl={onboardingUrl} />

        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          {tLogin("or")}
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <Link href={`/login?${callbackParam}`} className={linkClass}>
            {tLogin("submit")}
          </Link>
          {" · "}
          <Link href={`/signup?${callbackParam}`} className={linkClass}>
            {tSignup("submit")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
