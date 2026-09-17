"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Copy, Check, QrCode } from "lucide-react";
import { cardClass, labelClass } from "@/components/ui/styles";

export function JoinLinkCard({ termId }: { termId: string }) {
  const t = useTranslations("roster");
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/join/${termId}` : "";

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
    <div className={`${cardClass} space-y-2 p-4`}>
      <label className={labelClass}>{t("joinLink")}</label>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">{t("joinLinkHelp")}</p>

      <div className="flex items-center gap-1.5">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        />
        <button
          type="button"
          onClick={copy}
          title={copied ? tCommon("copied") : tCommon("copy")}
          className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#0f6e56] dark:text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowQr((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[#0f6e56] hover:underline dark:text-teal-400"
      >
        <QrCode className="h-3.5 w-3.5" aria-hidden />
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
          className="rounded-md border border-zinc-200 dark:border-zinc-800"
        />
      )}
    </div>
  );
}
