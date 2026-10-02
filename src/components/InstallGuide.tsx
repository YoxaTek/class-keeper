"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { detectOs } from "@/lib/os";
import s from "./InstallGuide.module.scss";

type Platform = "ios" | "android";

interface Marker {
  /** Centre of the ring, as a percentage of the screenshot. */
  x: number;
  y: number;
  /** A wider pill-shaped ring, for highlighting a switch. */
  pill?: boolean;
}

interface Shot {
  image: string;
  width: number;
  height: number;
  /** Translation key (under "install") for a label above this screenshot. */
  caption?: string;
  markers?: Marker[];
}

interface Step {
  key: string; // translation key under "install"
  shots: Shot[];
}

// Real screenshots of ClassKeeper, in /public/install. Marker positions point
// at the control to tap (or the setting to check) in each one. On Android,
// Chrome's own Install prompt is used when available (see InstallProvider);
// these steps are the manual path for when it isn't, ending with what you'll
// see after installing.
const STEPS: Record<Platform, Step[]> = {
  ios: [
    {
      key: "ios1",
      shots: [
        {
          image: "ios-share",
          width: 1178,
          height: 304,
          caption: "iosChrome",
          markers: [{ x: 79.8, y: 23 }],
        },
        {
          image: "ios-safari-share",
          width: 738,
          height: 1600,
          caption: "iosSafari",
          markers: [{ x: 49.5, y: 64.1 }],
        },
      ],
    },
    {
      key: "ios2",
      shots: [{ image: "ios-view-more", width: 1125, height: 823, markers: [{ x: 84.4, y: 63.2 }] }],
    },
    {
      key: "ios3",
      shots: [{ image: "ios-add-to-home", width: 738, height: 1600, markers: [{ x: 35.2, y: 67.1 }] }],
    },
    {
      key: "ios4",
      shots: [
        {
          image: "ios-add",
          width: 1179,
          height: 1004,
          // The "Open as Web App" switch first, then the Add button.
          markers: [
            { x: 87.8, y: 74.7, pill: true },
            { x: 87.8, y: 11.8 },
          ],
        },
      ],
    },
  ],
  android: [
    {
      key: "androidMenu",
      shots: [{ image: "android-menu", width: 720, height: 1650, markers: [{ x: 82, y: 80.4 }] }],
    },
    {
      key: "androidSheet",
      shots: [{ image: "android-add-sheet", width: 720, height: 1650, markers: [{ x: 85, y: 78.8 }] }],
    },
    {
      key: "androidConfirm",
      shots: [{ image: "android-install-dialog", width: 720, height: 1650, markers: [{ x: 80.8, y: 59.8 }] }],
    },
    { key: "androidSecurity", shots: [{ image: "android-security", width: 720, height: 1650 }] },
    {
      key: "androidIcon",
      shots: [{ image: "android-icon", width: 720, height: 1650, markers: [{ x: 15, y: 9.5 }] }],
    },
    { key: "androidOpen", shots: [{ image: "android-app", width: 720, height: 1650 }] },
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
        {steps.map((step, i) => (
          <li key={step.key} className={s.step}>
            <div className={s.stepHead}>
              <span className={s.pill}>{t("stepLabel", { n: i + 1 })}</span>
              <h3>{t(step.key)}</h3>
            </div>

            {step.shots.map((shot) => (
              <div key={shot.image} className={s.shotWrap}>
                {shot.caption && <p className={s.caption}>{t(shot.caption)}</p>}
                <figure className={`${s.shot} ${shot.height / shot.width > 1.2 ? s.portrait : ""}`}>
                  <Image
                    src={`/install/${shot.image}.jpg`}
                    alt=""
                    width={shot.width}
                    height={shot.height}
                    sizes="(max-width: 640px) 90vw, 24rem"
                  />
                  {shot.markers?.map((marker) => (
                    <span
                      key={`${marker.x}-${marker.y}`}
                      className={`${s.marker} ${marker.pill ? s.wide : ""}`}
                      aria-hidden
                      // Grid placement: left in % of the width; top in % of the
                      // width too (CSS margins resolve against width), hence the
                      // aspect-ratio conversion.
                      style={{
                        marginLeft: `${marker.x}%`,
                        marginTop: `${(marker.y * shot.height) / shot.width}%`,
                      }}
                    >
                      <span className={s.ring} />
                    </span>
                  ))}
                </figure>
              </div>
            ))}
          </li>
        ))}
      </ol>

      <p className={s.note}>{t(`${platform}Note`)}</p>
      <p className={s.note}>{t("signInNote")}</p>
    </div>
  );
}
