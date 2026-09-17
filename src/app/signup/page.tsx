import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { safeCallbackUrl } from "@/lib/safeCallbackUrl";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const t = await getTranslations("signup");
  const tCommon = await getTranslations("common");
  const providers = getEnabledProviders();
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>

        <SignupForm providers={providers} callbackUrl={safeCallbackUrl(callbackUrl)} />
      </div>
    </AuthShell>
  );
}
