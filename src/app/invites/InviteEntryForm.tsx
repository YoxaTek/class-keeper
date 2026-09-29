"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseInviteLink } from "@/lib/parseInviteLink";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";

export function InviteEntryForm() {
  const t = useTranslations("invites");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInviteLink(value, window.location.origin);
    if (!parsed) {
      setError(t("entryError"));
      return;
    }
    router.push(`/invites?${parsed.param}=${encodeURIComponent(parsed.value)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder={t("entryPlaceholder")}
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">
        {t("entrySubmit")}
      </Button>
    </form>
  );
}
