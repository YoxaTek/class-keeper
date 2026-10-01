"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { iconDangerClass } from "@/components/ui/styles";

export function CourseDeleteButton({ courseId, courseLabel }: { courseId: string; courseLabel: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(t("deleteCourseConfirm", { course: courseLabel }))) return;
    setDeleting(true);
    const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert(t("deleteCourseError"));
    }
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
