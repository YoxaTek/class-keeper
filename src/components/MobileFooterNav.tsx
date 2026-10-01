"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import s from "./MobileFooterNav.module.scss";
import { BookOpenCheck, CalendarRange, CircleUserRound, House, Users } from "lucide-react";

export function MobileFooterNav({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();

  // Same "who am I" display used by the header's ProfileMenu.
  const displayName = name || email;

  // Only rendered inside a course (see AppShell), so there is always one.
  const courseId = pathname.match(/^\/courses\/([^/]+)/)?.[1];
  const studentsHref = courseId ? `/courses/${courseId}/roster` : "/";
  const classesHref = courseId ? `/courses/${courseId}` : "/";
  const courseHref = courseId ? `/courses/${courseId}/course` : "/";

  const studentsActive =
    !!courseId && (pathname === `/courses/${courseId}/roster` || pathname.startsWith(`/courses/${courseId}/students/`));
  const classesActive =
    !!courseId && (pathname === `/courses/${courseId}` || pathname.startsWith(`/courses/${courseId}/sessions/`));
  const courseActive = pathname === `/courses/${courseId}/course`;
  const homeHref = "/";
  const homeActive = false;
  const profileActive = pathname === "/account";

  const profileTab = { href: "/account", label: displayName, icon: CircleUserRound, active: profileActive };

  const tabs = [
    { href: homeHref, label: t("common.home"), icon: House, active: homeActive },
    { href: courseHref, label: t("dashboard.course"), icon: BookOpenCheck, active: courseActive },
    { href: classesHref, label: t("sessions.title"), icon: CalendarRange, active: classesActive },
    { href: studentsHref, label: t("roster.title"), icon: Users, active: studentsActive },
    profileTab,
  ];

  return (
    <nav aria-label={t("common.mobileNav")} className={s.nav}>
      <ul className={s.tabs}>
        {tabs.map((tab) => (
          <li key={tab.href} className={s.item}>
            <Link href={tab.href} className={`${s.tab} ${tab.active ? s.active : ""}`}>
              <tab.icon aria-hidden />
              <span>{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
