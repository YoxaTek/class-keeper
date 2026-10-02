import Image from "next/image";
import { useTranslations } from "next-intl";
import { BookOpenCheck } from "lucide-react";
import { InstallBanner } from "@/components/InstallBanner";
import s from "./AuthShell.module.scss";

/**
 * Shared frame for the signed-out screens (login/signup/onboarding/invite):
 * a fixed branded panel plus a left-aligned content column — deliberately
 * not a floating white card centered on a gray page.
 */
export function AuthShell({ children, appName }: { children: React.ReactNode; appName: string }) {
  const t = useTranslations("common");
  return (
    <div className={s.root}>
      <InstallBanner />
      <div className={s.shell}>
        <div className={s.brand}>
          <div className={s.logo}>
            <Image src="/icon-512.png" alt="" width={24} height={24} />
            {appName}
          </div>
          <div className={s.tagline}>
            <BookOpenCheck aria-hidden />
            <p>{t("tagline")}</p>
          </div>
          <div />
        </div>
        <div className={s.content}>
          <div className={s.column}>{children}</div>
        </div>
      </div>
    </div>
  );
}
