import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreditCard, MessageSquareText, Smartphone } from "lucide-react";
import { getCurrentUser } from "@/lib/currentUser";
import { QrScannerButton } from "@/components/QrScanner";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { THEME_COOKIE, isTheme } from "@/lib/theme";
import { DeleteAccountSection } from "./DeleteAccountSection";
import s from "./account.module.scss";
import f from "@/components/ui/form.module.scss";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";
  const t = await getTranslations("account");
  const tCommon = await getTranslations("common");
  const tBilling = await getTranslations("billing");
  const tDashboard = await getTranslations("dashboard");
  const tInstall = await getTranslations("install");

  const displayName = user.name || user.email;
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = tCommon(`role.${user.role}`);

  return (
    <div className={s.page}>
      <h1 className={f.pageTitle}>{t("title")}</h1>

      <div className={`${s.row} ${s.between}`}>
        <div className={s.who}>
          {user.image ? (
            <Image src={user.image} alt="" width={40} height={40} />
          ) : (
            <span className={s.initial}>
              {initial}
            </span>
          )}
          <div>
            <p className={s.name}>{displayName}</p>
            <p className={s.role}>{roleLabel}</p>
          </div>
        </div>
        <SignOutButton label={tCommon("signOut")} />
      </div>

      <div className={`${s.row} ${s.between}`}>
        <p>{tCommon("language")}</p>
        <LanguageSwitcher />
      </div>

      <div className={`${s.row} ${s.between}`}>
        <p>{t("theme")}</p>
        <ThemeSwitcher initial={theme} />
      </div>

      {user.role === "TEACHER" && (
        <Link
          href="/billing"
          className={`${s.row} ${s.link}`}
        >
          <CreditCard size={16} aria-hidden />
          {tBilling("title")}
        </Link>
      )}

      {user.role !== "STUDENT" && (
        <Link href="/feedback" className={`${s.row} ${s.link}`}>
          <MessageSquareText size={16} aria-hidden />
          {t("feedbackLink")}
        </Link>
      )}

      <Link
        href="/install"
        className={`${s.row} ${s.link}`}
      >
        <Smartphone size={16} aria-hidden />
        {tInstall("link")}
      </Link>

      <QrScannerButton
        triggerLabel={t("haveInvite")}
        title={tDashboard("acceptInviteTitle")}
        helpText={tDashboard("acceptInviteHelp")}
        variant="ghost"
        className={`${s.invite} ${s.link}`}
      />

      <DeleteAccountSection email={user.email} />
    </div>
  );
}
