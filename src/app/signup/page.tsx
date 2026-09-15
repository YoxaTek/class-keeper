import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";

export default async function SignupPage() {
  const t = await getTranslations("signup");
  const tLogin = await getTranslations("login");
  const tCommon = await getTranslations("common");
  const providers = getEnabledProviders();

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>

        <ProviderSignInButtons providers={providers} />

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          {t("haveAccount")} <Link href="/login" className={linkClass}>{tLogin("submit")}</Link>
        </p>
      </div>
    </AuthShell>
  );
}
