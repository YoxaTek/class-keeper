"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { buttonClass, iconButtonClass } from "@/components/ui/styles";
import { SessionForm, type SessionFormValues } from "@/components/SessionForm";
import f from "@/components/ui/form.module.scss";

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
          className={iconButtonClass}
        >
          <Pencil size={14} aria-hidden />
        </button>
      );
    }
    return (
      <button onClick={() => setOpen(true)} className={buttonClass("primary", "sm")}>
        <Plus size={14} aria-hidden />
        {t("newSession")}
      </button>
    );
  }

  return (
    <Drawer
      title={props.mode === "edit" ? t("editTitle") : t("newTitle")}
      onClose={() => setOpen(false)}
      footer={
        <div className={f.actions}>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="session-form" variant="primary" disabled={submitting}>
            {tc("save")}
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
