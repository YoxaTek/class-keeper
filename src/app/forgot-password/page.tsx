import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import f from "@/components/ui/form.module.scss";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");
  const tCommon = await getTranslations("common");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className={f.stack}>
        <div className={f.field}>
          <h1 className={f.heading}>{t("title")}</h1>
          <p className={f.muted}>{t("subtitle")}</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
