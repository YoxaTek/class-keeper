import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";

export default async function SignupPage() {
  const t = await getTranslations("signup");
  const tLogin = await getTranslations("login");
  const providers = getEnabledProviders();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{t("subtitle")}</p>
        </div>

        <ProviderSignInButtons providers={providers} />

        <p className="text-center text-sm text-black/60 dark:text-white/60">
          {t("haveAccount")} <Link href="/login" className="underline">{tLogin("submit")}</Link>
        </p>
      </div>
    </div>
  );
}
