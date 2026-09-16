"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProfileMenu } from "@/components/ProfileMenu";
import { TermSelector } from "@/components/TermSelector";

export function AppShell({
  name,
  email,
  image,
  role,
  terms,
  children,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  terms: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const termId = pathname.match(/^\/terms\/([^/]+)/)?.[1];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Image src="/icon-512.png" alt="" width={20} height={20} className="rounded-sm" />
            {t("common.appName")}
          </Link>
          {termId && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <TermSelector terms={terms} currentTermId={termId} />
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ProfileMenu name={name} email={email} image={image} role={role} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
