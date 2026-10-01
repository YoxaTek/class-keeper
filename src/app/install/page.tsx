import Link from "next/link";
import { Download, EllipsisVertical, Globe, Share, SquarePlus, Smartphone, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";
import s from "./install.module.scss";
import f from "@/components/ui/form.module.scss";

type Step = { key: string; icon: LucideIcon };

const GUIDES: { id: "ios" | "android"; steps: Step[] }[] = [
  {
    id: "ios",
    steps: [
      { key: "ios1", icon: Globe },
      { key: "ios2", icon: Share },
      { key: "ios3", icon: SquarePlus },
      { key: "ios4", icon: SquarePlus },
      { key: "ios5", icon: Smartphone },
    ],
  },
  {
    id: "android",
    steps: [
      { key: "android1", icon: Globe },
      { key: "android2", icon: EllipsisVertical },
      { key: "android3", icon: Download },
      { key: "android4", icon: Download },
      { key: "android5", icon: Smartphone },
    ],
  },
];

export default async function InstallPage() {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("install");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className={f.stackLg}>
        <div className={f.field}>
          <h1 className={f.heading}>{t("title")}</h1>
          <p className={f.muted}>
            {t("intro")}
          </p>
        </div>

        {GUIDES.map((guide) => (
          <section key={guide.id} className={s.guide}>
            <h2 className={s.guideTitle}>{t(`${guide.id}Title`)}</h2>
            <p className={s.note}>{t(`${guide.id}Note`)}</p>
            <ol className={s.steps}>
              {guide.steps.map((step, i) => (
                <li
                  key={step.key}
                  className={s.step}
                >
                  <span className={s.icon}>
                    <step.icon aria-hidden />
                  </span>
                  <span>
                    <span className={`tabular ${s.number}`}>{i + 1}. </span>
                    {t(step.key)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <Link href="/" className={linkClass}>
          {tCommon("home")}
        </Link>
      </div>
    </AuthShell>
  );
}
