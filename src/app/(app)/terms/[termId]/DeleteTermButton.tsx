"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

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
    <button onClick={onDelete} disabled={deleting} className={buttonClass("danger", "sm")}>
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {t("deleteTerm")}
    </button>
  );
}
