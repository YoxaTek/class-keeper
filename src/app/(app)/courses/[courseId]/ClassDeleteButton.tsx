"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { iconDangerClass } from "@/components/ui/styles";

export function ClassDeleteButton({ courseId, sessionId }: { courseId: string; sessionId: string }) {
  const t = useTranslations("sessions");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    await fetch(`/api/courses/${courseId}/sessions/${sessionId}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      disabled={deleting}
      title={tc("delete")}
      className={iconDangerClass}
    >
      <Trash2 size={14} aria-hidden />
    </button>
  );
}
