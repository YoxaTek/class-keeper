"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function DeleteTermButton({ termId, termLabel }: { termId: string; termLabel: string }) {
  const t = useTranslations("dashboard");
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(t("deleteTermConfirm", { term: termLabel }))) return;
    setDeleting(true);
    const res = await fetch(`/api/terms/${termId}`, { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setDeleting(false);
    alert(t("deleteTermError"));
  }

  return (
    <button onClick={onDelete} disabled={deleting} className="text-sm text-red-600 underline disabled:opacity-50">
      {t("deleteTerm")}
    </button>
  );
}
