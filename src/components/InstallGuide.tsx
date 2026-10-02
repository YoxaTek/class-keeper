"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { detectOs } from "@/lib/os";
import s from "./InstallGuide.module.scss";

type Platform = "ios" | "android";

interface Step {
  key: string; // translation key under "install"
  image: string;
  width: number;
  height: number;
  /** Where the tap-here marker goes, as a percentage of the screenshot. */
  marker?: { x: number; y: number };
}

// Real screenshots of ClassKeeper, in /public/install. Marker positions point
// at the control to tap in each one. On Android, Chrome's own Install prompt
// is used when available (see InstallProvider); these steps are the manual
// path for when it isn't, ending with what you'll see after installing.
const STEPS: Record<Platform, Step[]> = {
  ios: [
    { key: "ios1", image: "ios-share", width: 1178, height: 304, marker: { x: 79.8, y: 23 } },
    { key: "ios2", image: "ios-view-more", width: 1125, height: 823, marker: { x: 84.4, y: 63.2 } },
    { key: "ios3", image: "ios-add-to-home", width: 794, height: 1600, marker: { x: 38, y: 53.3 } },
    { key: "ios4", image: "ios-add", width: 1179, height: 1004, marker: { x: 87.8, y: 11.8 } },
  ],
  android: [
    { key: "androidMenu", image: "android-menu", width: 720, height: 1650, marker: { x: 82, y: 80.4 } },
    { key: "androidSheet", image: "android-add-sheet", width: 720, height: 1650, marker: { x: 85, y: 78.8 } },
    { key: "androidConfirm", image: "android-install-dialog", width: 720, height: 1650, marker: { x: 80.8, y: 59.8 } },
    { key: "androidSecurity", image: "android-security", width: 720, height: 1650 },
    { key: "androidIcon", image: "android-icon", width: 720, height: 1650, marker: { x: 15, y: 9.5 } },
    { key: "androidOpen", image: "android-app", width: 720, height: 1650 },
  ],
};

const noSubscribe = () => () => {};

/**
 * Install steps for the OS being used — only that OS's. On a desktop browser
 * (neither iPhone nor Android) there's nothing to detect, so both are offered
 * as tabs.
 */
export function InstallGuide() {
  const t = useTranslations("install");
  const os = useSyncExternalStore(noSubscribe, detectOs, () => "ios" as const);
  const [chosen, setChosen] = useState<Platform>("ios");
  const platform: Platform = os === "other" ? chosen : os;
  const steps = STEPS[platform];

  return (
    <div className={s.guide}>
      {os === "other" && (
        <div className={s.tabs} role="tablist">
          {(["ios", "android"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              onClick={() => setChosen(p)}
              className={`${s.tab} ${platform === p ? s.active : ""}`}
            >
              {t(p === "ios" ? "tabIos" : "tabAndroid")}
            </button>
          ))}
        </div>
      )}

      <div className={s.heading}>
        <h2>{t(`${platform}Heading`)}</h2>
        <p>{t(`${platform}Sub`)}</p>
      </div>

      <ol className={s.steps}>
        {steps.map((step, i) => {
          const portrait = step.height / step.width > 1.2;
          return (
            <li key={step.key} className={s.step}>
              <div className={s.stepHead}>
                <span className={s.pill}>{t("stepLabel", { n: i + 1 })}</span>
                <h3>{t(step.key)}</h3>
              </div>

              <figure className={`${s.shot} ${portrait ? s.portrait : ""}`}>
                <Image
                  src={`/install/${step.image}.jpg`}
                  alt=""
                  width={step.width}
                  height={step.height}
                  sizes="(max-width: 640px) 90vw, 24rem"
                />
                {step.marker && (
                  <span
                    className={s.marker}
                    aria-hidden
                    // Grid placement: left in % of the width; top in % of the
                    // width too (CSS margins resolve against width), hence the
                    // aspect-ratio conversion.
                    style={{
                      marginLeft: `${step.marker.x}%`,
                      marginTop: `${(step.marker.y * step.height) / step.width}%`,
                    }}
                  >
                    <span className={s.ring} />
                  </span>
                )}
              </figure>
            </li>
          );
        })}
      </ol>

      <p className={s.note}>{t(`${platform}Note`)}</p>
      <p className={s.note}>{t("signInNote")}</p>
    </div>
  );
}
