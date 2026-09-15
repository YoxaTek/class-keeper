"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

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
  );
}
