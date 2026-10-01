"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseInviteLink } from "@/lib/parseInviteLink";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

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
    <form onSubmit={onSubmit} className={f.stackSm}>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder={t("entryPlaceholder")}
        className={inputClass}
      />
      {error && <p className={f.error}>{error}</p>}
      <Button type="submit" variant="primary" className={f.block}>
        {t("entrySubmit")}
      </Button>
    </form>
  );
}
