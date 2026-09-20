"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { buttonClass } from "@/components/ui/styles";
import { SessionForm, type SessionFormValues } from "@/components/SessionForm";

type Props =
  | { mode: "create"; courseId: string }
  | { mode: "edit"; courseId: string; sessionId: string; initial: SessionFormValues };

export function ClassFormDrawer(props: Props) {
  const t = useTranslations("sessions");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function onSaved() {
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    if (props.mode === "edit") {
      return (
        <button
          onClick={() => setOpen(true)}
          title={tc("edit")}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      );
    }
    return (
      <button onClick={() => setOpen(true)} className={buttonClass("primary", "sm")}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t("newSession")}
      </button>
    );
  }

  return (
    <Drawer
      title={props.mode === "edit" ? t("editTitle") : t("newTitle")}
      onClose={() => setOpen(false)}
      footer={
        <div className="flex gap-2">
          <Button type="submit" form="session-form" variant="primary" disabled={submitting}>
            {tc("save")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
        </div>
      }
    >
      <SessionForm
        courseId={props.courseId}
        sessionId={props.mode === "edit" ? props.sessionId : undefined}
        initial={props.mode === "edit" ? props.initial : undefined}
        onSaved={onSaved}
        onSubmittingChange={setSubmitting}
      />
    </Drawer>
  );
}
