"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Role } from "@prisma/client";
import type { Theme } from "@/lib/theme";
import s from "./ProfileMenu.module.scss";

export function ProfileMenu({
  name,
  email,
  image,
  role,
  theme,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  theme: Theme;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on any click outside the menu (replaces a full-screen backdrop layer).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const displayName = name || email;
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = t(`common.role.${role}`);

  return (
    <div ref={rootRef} className={s.root}>
      {open && (
        <div className={s.menu}>
          <div className={s.who}>
            <p className={s.name}>{displayName}</p>
            <p className={s.role}>{roleLabel}</p>
          </div>
          <Link href="/account" onClick={() => setOpen(false)} className={s.item}>
            <Settings aria-hidden />
            {t("account.title")}
          </Link>
          <div className={s.setting}>
            <span>{t("common.language")}</span>
            <LanguageSwitcher />
          </div>
          <div className={s.setting}>
            <span>{t("account.theme")}</span>
            <ThemeSwitcher initial={theme} compact />
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className={s.item}>
            <LogOut aria-hidden />
            {t("common.signOut")}
          </button>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className={s.trigger}>
        {image ? (
          <Image src={image} alt="" width={36} height={36} />
        ) : (
          <span className={s.initial}>{initial}</span>
        )}
        <ChevronDown className={`${s.chevron} ${open ? s.open : ""}`} aria-hidden />
      </button>
    </div>
  );
}
