import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import { InstallGuide } from "@/components/InstallGuide";

export default async function InstallPage() {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("install");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className={f.stack}>
        <div className={f.field}>
          <h1 className={f.heading}>{t("howTo")}</h1>
          <p className={f.muted}>{t("intro")}</p>
        </div>

        <InstallGuide />

        <Link href="/" className={linkClass}>
          {tCommon("home")}
        </Link>
      </div>
    </AuthShell>
  );
}
