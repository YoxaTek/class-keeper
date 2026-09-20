import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");
  const tCommon = await getTranslations("common");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
