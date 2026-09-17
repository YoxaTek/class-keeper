"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings, CreditCard } from "lucide-react";
import type { Role } from "@prisma/client";

export function ProfileMenu({
  name,
  email,
  image,
  role,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const displayName = name || email;
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = t(`common.role.${role}`);

  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">{roleLabel}</p>
            </div>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Settings className="h-4 w-4" aria-hidden />
              {t("account.title")}
            </Link>
            {role === "TEACHER" && (
              <Link
                href="/billing"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                {t("billing.title")}
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("common.signOut")}
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {image ? (
          <Image src={image} alt="" width={24} height={24} className="rounded-full" />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f6e56] text-xs font-medium text-white">
            {initial}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
    </div>
  );
}
