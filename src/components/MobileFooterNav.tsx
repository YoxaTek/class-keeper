"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenCheck, CalendarRange, CircleUserRound, House, Users } from "lucide-react";

export function MobileFooterNav({
  name,
  email,
  simple = false,
  onHeightChange,
}: {
  name: string | null;
  email: string;
  // Students only ever get Home + Profile — Course/Classes/Students are
  // teacher/TA concepts (managing a roster/sessions), not something a
  // student's own read-only view needs, so there's no course-scoped set
  // for them at all, unlike staff outside a course.
  simple?: boolean;
  onHeightChange?: (height: number) => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Same "who am I" display used by the header's ProfileMenu.
  const displayName = name || email;

  // Course/Classes/Students only make sense once an actual course is
  // selected — no fallback to "some" course on pages like /account, or
  // they'd show up scoped to a course the user never picked.
  const courseId = simple ? undefined : pathname.match(/^\/courses\/([^/]+)/)?.[1];
  const studentsHref = courseId ? `/courses/${courseId}/roster` : "/";
  const classesHref = courseId ? `/courses/${courseId}` : "/";
  const courseHref = courseId ? `/courses/${courseId}/course` : "/";

  const studentsActive =
    !!courseId && (pathname === `/courses/${courseId}/roster` || pathname.startsWith(`/courses/${courseId}/students/`));
  const classesActive =
    !!courseId && (pathname === `/courses/${courseId}` || pathname.startsWith(`/courses/${courseId}/sessions/`));
  const courseActive = pathname === `/courses/${courseId}/course`;
  const homeHref = simple ? "/me" : "/";
  const homeActive = pathname === "/" || pathname === "/me";
  const profileActive = pathname === "/account";

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const report = () => onHeightChange?.(nav.offsetHeight);

    report();
    const observer = new ResizeObserver(report);
    observer.observe(nav);
    window.addEventListener("resize", report);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [onHeightChange]);

  const profileTab = { href: "/account", label: displayName, icon: CircleUserRound, active: profileActive };

  // No selected course (the courses list, /account, ...) gets just Home +
  // Profile; once inside a course, the full set appears.
  const tabs = !courseId
    ? [{ href: homeHref, label: t("common.home"), icon: House, active: homeActive }, profileTab]
    : [
        { href: homeHref, label: t("common.home"), icon: House, active: homeActive },
        { href: courseHref, label: t("dashboard.course"), icon: BookOpenCheck, active: courseActive },
        { href: classesHref, label: t("sessions.title"), icon: CalendarRange, active: classesActive },
        { href: studentsHref, label: t("roster.title"), icon: Users, active: studentsActive },
        profileTab,
      ];

  return (
    <nav
      ref={navRef}
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pt-1 backdrop-blur lg:hidden print:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul
        className={`grid gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] ${
          tabs.length === 2 ? "grid-cols-2" : "grid-cols-5"
        }`}
      >
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-md px-1 text-[11px] leading-tight ${
                tab.active
                  ? "text-[#0f6e56] dark:text-teal-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <tab.icon className="mb-0.5 h-4.5 w-4.5" aria-hidden />
              <span className="max-w-full truncate">{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
