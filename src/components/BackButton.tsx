"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import s from "./BackButton.module.scss";

// Returns to wherever the user came from (e.g. the course they opened
// Account from); falls back to the course list when the page was opened
// directly and there's no history to go back to.
export function BackButton() {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={t("back")}
      className={s.back}
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
    >
      <ArrowLeft size={20} aria-hidden />
    </button>
  );
}
