"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

export function TermDeleteButton({ termId, termLabel }: { termId: string; termLabel: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(t("deleteTermConfirm", { term: termLabel }))) return;
    setDeleting(true);
    const res = await fetch(`/api/terms/${termId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert(t("deleteTermError"));
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={deleting}
      title={tc("delete")}
      className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-red-950 dark:hover:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
