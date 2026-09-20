"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Copy, Check, QrCode } from "lucide-react";

export function InviteLinkBox({ token, showQr = false }: { token: string; showQr?: boolean }) {
  const t = useTranslations("common");
  const tRoster = useTranslations("roster");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) — the
      // input is still selectable/copyable manually, so this is non-fatal.
    }
  }

  return (
    <div className="space-y-2">
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
          title={copied ? t("copied") : t("copy")}
          className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#0f6e56] dark:text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showQr && (
        <>
          <button
            type="button"
            onClick={() => setQrOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[#0f6e56] hover:underline dark:text-teal-400"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            {qrOpen ? tRoster("hideQr") : tRoster("showQr")}
          </button>

          {qrOpen && url && (
            // Same public QR image service as JoinLinkCard — an invite
            // link is meant to be shared by whoever holds it anyway, so
            // there's nothing sensitive in what's sent to generate it.
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
              alt={t("qrCode")}
              width={180}
              height={180}
              unoptimized
              className="rounded-md border border-zinc-200 dark:border-zinc-800"
            />
          )}
        </>
      )}
    </div>
  );
}
