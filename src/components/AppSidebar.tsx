"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import s from "./AppSidebar.module.scss";
import { LayoutGrid, Users, CalendarRange, TriangleAlert } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType;
}

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const courseMatch = pathname.match(/^\/courses\/([^/]+)/);
  const courseId = courseMatch?.[1];

  if (!courseId) return null;

  const items: NavItem[] = [
    { href: "/", label: t("dashboard.title"), icon: LayoutGrid },
    { href: `/courses/${courseId}/roster`, label: t("roster.title"), icon: Users },
    { href: `/courses/${courseId}`, label: t("sessions.title"), icon: CalendarRange },
    { href: `/courses/${courseId}/below-passing`, label: t("belowPassing.title"), icon: TriangleAlert },
  ];

  // Mobile uses the bottom tab bar (MobileFooterNav) — this is desktop-only.
  return (
    <aside className={s.sidebar}>
      <nav className={s.nav}>
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className={`${s.item} ${pathname === href ? s.active : ""}`}>
            <Icon aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
