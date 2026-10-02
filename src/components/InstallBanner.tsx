"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useInstall } from "@/components/InstallProvider";
import s from "./InstallBanner.module.scss";

const noSubscribe = () => () => {};

// Running as the installed app (opened from the home screen). This is the only
// state we can actually detect: a browser tab can't tell whether the app is
// also installed on the phone, so the banner is otherwise always shown.
function runningAsInstalledApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const t = useTranslations("install");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const isInstalledApp = useSyncExternalStore(noSubscribe, runningAsInstalledApp, () => true);
  const { install } = useInstall();

  // No server render (true on the server) so it can't flash inside the installed app.
  if (isInstalledApp || pathname === "/install") return null;

  return (
    <div className={s.banner}>
      <Image src="/icon-512.png" alt="" width={40} height={40} className={s.icon} />
      <div className={s.text}>
        <strong>{tCommon("appName")}</strong>
        <span>{t("bannerTagline")}</span>
      </div>
      <button type="button" onClick={install} className={s.install}>
        {t("bannerInstall")}
      </button>
    </div>
  );
}
