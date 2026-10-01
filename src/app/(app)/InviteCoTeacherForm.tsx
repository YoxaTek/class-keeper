"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRoundPlus } from "lucide-react";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, cardClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./inviteCoTeacher.module.scss";

export function InviteCoTeacherForm() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "TEACHER", email: email || undefined }),
    });

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setToken(body.token);
    } else {
      setError(typeof body?.error === "string" ? body.error : t("onboarding.genericError"));
    }
  }

  return (
    <div className={`${cardClass} ${f.panel} ${s.card}`}>
      <h3 className={s.title}>{t("dashboard.inviteCoTeacher")}</h3>
      <form onSubmit={onSubmit} className={s.form}>
        <div className={`${f.field} ${s.email}`}>
          <label htmlFor="co-teacher-email" className={labelClass}>
            {t("roster.inviteTAEmail")}
          </label>
          <input
            id="co-teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" variant="primary" disabled={submitting}>
          <UserRoundPlus size={16} aria-hidden />
          {t("dashboard.inviteCoTeacher")}
        </Button>
      </form>
      {error && <p className={f.error}>{error}</p>}
      {token && <InviteLinkBox token={token} />}
    </div>
  );
}
