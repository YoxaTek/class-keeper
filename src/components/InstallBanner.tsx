"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import s from "./InstallBanner.module.scss";

const DISMISSED_KEY = "installBannerDismissed";

// Chrome's "install this app" event — not in the DOM typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * A slim "Add ClassKeeper to your home screen" bar across the top on phones.
 * Install opens Chrome's own install prompt when the browser offers one
 * (Android), otherwise the step-by-step /install guide (iPhone). Hidden when
 * the app is already installed (opened from the home screen), once
 * dismissed, and on the guide itself.
 */
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
  const router = useRouter();
  const pathname = usePathname();
  const canShow = useSyncExternalStore(noSubscribe, eligible, () => false);
  const [dismissed, setDismissed] = useState(false);
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null);
  const visible = canShow && !dismissed;

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      promptEvent.current = e as BeforeInstallPromptEvent;
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || pathname === "/install") return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // not persisted — it will reappear next visit
    }
    setDismissed(true);
  }

  async function install() {
    if (promptEvent.current) {
      await promptEvent.current.prompt();
      promptEvent.current = null;
      return;
    }
    router.push("/install");
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
      <button type="button" onClick={install} className={s.install}>
        {t("bannerInstall")}
      </button>
    </div>
  );
}
