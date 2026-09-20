import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { safeCallbackUrl } from "@/lib/safeCallbackUrl";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const providers = getEnabledProviders();
  const t = await getTranslations("login");
  const tCommon = await getTranslations("common");
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>

        <LoginForm providers={providers} callbackUrl={safeCallbackUrl(callbackUrl)} />
      </div>
    </AuthShell>
  );
}
