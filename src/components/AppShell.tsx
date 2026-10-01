"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import type { Theme } from "@/lib/theme";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { AdSlot } from "@/components/AdSlot";
import { BackButton } from "@/components/BackButton";
import { MobileFooterNav } from "@/components/MobileFooterNav";
import s from "./AppShell.module.scss";

export function AppShell({
  name,
  email,
  image,
  role,
  theme,
  courses,
  children,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  theme: Theme;
  courses: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const showBack = pathname !== "/" && pathname !== "/me";
  const courseId = pathname.match(/^\/courses\/([^/]+)/)?.[1];
  const currentCourse = courseId ? courses.find((course) => course.id === courseId) : undefined;

  return (
    <div className={s.shell}>
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
          {currentCourse && (
            <span className={s.courseName}>
              <BookOpenCheck aria-hidden />
              <span>{currentCourse.label}</span>
            </span>
          )}
          {/* Inside a course the footer tabs carry Profile on mobile; everywhere
              else (course list, account, student pages) the header does. */}
          <div className={`${s.profile} ${courseId ? "" : s.always}`}>
            <ProfileMenu name={name} email={email} image={image} role={role} theme={theme} />
          </div>
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
          <MobileFooterNav name={name} email={email} />
        </div>
      )}
    </div>
  );
}
