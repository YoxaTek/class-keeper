"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/Drawer";
import { InstallGuide } from "@/components/InstallGuide";

// Chrome's "install this app" event — not in the DOM typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const InstallContext = createContext<{ install: () => void } | null>(null);

/**
 * One place that knows how to install the app. `install()`:
 * - on Android Chrome (which offers its own install prompt) opens that
 *   prompt directly — it installs, runs its security check and puts the icon
 *   on the home screen, so no instructions are needed;
 * - everywhere else (iPhone has no such prompt) slides up the how-to guide.
 */
export function InstallProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("install");
  const [guideOpen, setGuideOpen] = useState(false);
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      promptEvent.current = e as BeforeInstallPromptEvent;
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    const event = promptEvent.current;
    if (event) {
      promptEvent.current = null; // a prompt can only be used once
      await event.prompt();
      return;
    }
    setGuideOpen(true);
  }

  return (
    <InstallContext.Provider value={{ install }}>
      {children}
      {guideOpen && (
        <Drawer title={t("howTo")} onClose={() => setGuideOpen(false)}>
          <InstallGuide />
        </Drawer>
      )}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error("useInstall must be used inside <InstallProvider>");
  return ctx;
}
