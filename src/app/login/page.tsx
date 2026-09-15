import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const providers = getEnabledProviders();
  const t = await getTranslations("common");

  return (
    <AuthShell appName={t("appName")}>
      <LoginForm providers={providers} />
    </AuthShell>
  );
}
