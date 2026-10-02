"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useInstall } from "@/components/InstallProvider";
import s from "./InstallBanner.module.scss";

const DISMISSED_KEY = "installBannerDismissed";

const noSubscribe = () => () => {};

// Already installed (opened from the home screen) or dismissed earlier.
function eligible(): boolean {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (installed) return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) !== "1";
  } catch {
    return true; // storage blocked (private mode): just show the bar
  }
}

export function InstallBanner() {
  const t = useTranslations("install");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const canShow = useSyncExternalStore(noSubscribe, eligible, () => false);
  const { install } = useInstall();
  const [dismissed, setDismissed] = useState(false);
  const visible = canShow && !dismissed;

  if (!visible || pathname === "/install") return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // not persisted — it will reappear next visit
    }
    setDismissed(true);
  }

  return (
    <div className={s.banner}>
      <button type="button" onClick={dismiss} aria-label={t("bannerClose")} className={s.close}>
        <X size={16} aria-hidden />
      </button>
      <Image src="/icon-512.png" alt="" width={40} height={40} className={s.icon} />
      <div className={s.text}>
        <strong>{tCommon("appName")}</strong>
        <span>{t("bannerTagline")}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true); // out of the way while the prompt / guide is up (this visit only)
          install();
        }}
        className={s.install}
      >
        {t("bannerInstall")}
      </button>
    </div>
  );
}
