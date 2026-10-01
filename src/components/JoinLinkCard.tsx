"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Copy, Check, QrCode } from "lucide-react";
import { cardClass, labelClass } from "@/components/ui/styles";
import s from "./linkShare.module.scss";
import f from "@/components/ui/form.module.scss";

export function JoinLinkCard({ courseId }: { courseId: string }) {
  const t = useTranslations("roster");
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/join/${courseId}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the input is still manually copyable.
    }
  }

  return (
    <div className={`${cardClass} ${f.panel}`}>
      <label className={labelClass}>{t("joinLink")}</label>
      <p className={f.hint}>{t("joinLinkHelp")}</p>

      <div className={s.row}>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={s.field}
        />
        <button
          type="button"
          onClick={copy}
          title={copied ? tCommon("copied") : tCommon("copy")}
          className={s.copy}
        >
          {copied ? <Check size={14} className={s.copied} /> : <Copy size={14} />}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowQr((v) => !v)}
        className={s.toggle}
      >
        <QrCode size={14} aria-hidden />
        {showQr ? t("hideQr") : t("showQr")}
      </button>

      {showQr && url && (
        // ponytail: rendered via a public QR image service rather than a
        // client-side QR library — the join link is meant to be shared
        // publicly anyway, so there's nothing sensitive in what's sent.
        // Swap for a local-generation library if that stops being true.
        <Image
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
          alt={t("joinLink")}
          width={180}
          height={180}
          unoptimized
          className={s.qr}
        />
      )}
    </div>
  );
}
