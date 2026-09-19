"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { AdSlot } from "@/components/AdSlot";
import { MobileFooterNav } from "@/components/MobileFooterNav";

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
  const currentTerm = termId ? terms.find((term) => term.id === termId) : undefined;
  const isTermsList = pathname === "/";
  const [footerHeight, setFooterHeight] = useState(0);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Image src="/icon-512.png" alt="" width={20} height={20} className="rounded-sm" />
            {t("common.appName")}
          </Link>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {currentTerm && (
            <span className="flex min-w-0 max-w-[45vw] items-center gap-1.5 truncate text-sm font-bold text-[#0f6e56] lg:max-w-none dark:text-teal-400">
              <BookOpenCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{currentTerm.label}</span>
            </span>
          )}
          {/* On mobile, other pages have the footer's Settings tab for this — only the
              Terms list hides the footer, so it needs profile access in the header. */}
          <div className={isTermsList ? "" : "hidden lg:block"}>
            <ProfileMenu name={name} email={email} image={image} role={role} />
          </div>
        </div>
      </header>
      <AdSlot />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main
          className="flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-5 lg:pb-5"
          style={footerHeight ? { paddingBottom: footerHeight + 16 } : undefined}
        >
          {children}
        </main>
      </div>
      <MobileFooterNav terms={terms} onHeightChange={setFooterHeight} />
    </div>
  );
}
