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
  const t = await getTranslations("common");
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell appName={t("appName")}>
      <LoginForm providers={providers} callbackUrl={safeCallbackUrl(callbackUrl)} />
    </AuthShell>
  );
}
