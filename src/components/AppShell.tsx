"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import type { Theme } from "@/lib/theme";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { AdSlot } from "@/components/AdSlot";
import { InstallBanner } from "@/components/InstallBanner";
import { BackButton } from "@/components/BackButton";
import { MobileFooterNav } from "@/components/MobileFooterNav";
import s from "./AppShell.module.scss";

export function AppShell({
  name,
  email,
  image,
  role,
  theme,
  children,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  theme: Theme;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const showBack = pathname !== "/" && pathname !== "/me";
  const courseId = pathname.match(/^\/courses\/([^/]+)/)?.[1];

  return (
    <div className={s.shell}>
      <InstallBanner />
      <header className={s.header}>
        <div className={s.headerStart}>
          {/* Back appears everywhere except the two "home" screens. It is always
              mounted so its slot can animate open/closed, sliding the title. */}
          <div className={`${s.backSlot} ${showBack ? s.show : ""}`} inert={!showBack}>
            <BackButton />
          </div>
          <Link href="/" className={s.brand}>
            <Image src="/icon-512.png" alt="" width={28} height={28} />
            {t("common.appName")}
          </Link>
        </div>
        <div className={s.headerEnd}>
          <ProfileMenu name={name} email={email} image={image} role={role} theme={theme} />
        </div>
      </header>
      <div className={s.ad}>
        <AdSlot />
      </div>
      <div className={s.body}>
        <div className={s.sidebar}>
          <AppSidebar />
        </div>
        <main className={s.main}>{children}</main>
      </div>
      {courseId && (
        <div className={s.footer}>
          <MobileFooterNav />
        </div>
      )}
    </div>
  );
}
