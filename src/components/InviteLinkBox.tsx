"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Copy, Check, QrCode } from "lucide-react";
import f from "@/components/ui/form.module.scss";
import s from "./linkShare.module.scss";

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
    <div className={f.stackXs}>
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
          title={copied ? t("copied") : t("copy")}
          className={s.copy}
        >
          {copied ? <Check size={14} className={s.copied} /> : <Copy size={14} />}
        </button>
      </div>

      {showQr && (
        <>
          <button
            type="button"
            onClick={() => setQrOpen((v) => !v)}
            className={s.toggle}
          >
            <QrCode size={14} aria-hidden />
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
              className={s.qr}
            />
          )}
        </>
      )}
    </div>
  );
}
