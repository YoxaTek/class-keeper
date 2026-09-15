"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function InviteLinkBox({ token }: { token: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
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
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded border border-black/10 px-2 py-1 text-xs dark:border-white/20"
      />
      <button type="button" onClick={copy} className="shrink-0 rounded border px-2 py-1 text-xs">
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
