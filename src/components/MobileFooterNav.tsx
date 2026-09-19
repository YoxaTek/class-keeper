"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenCheck, CalendarRange, House, Settings, Users } from "lucide-react";

export function MobileFooterNav({
  terms,
  onHeightChange,
}: {
  terms: { id: string; label: string }[];
  onHeightChange?: (height: number) => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const activeTermId = pathname.match(/^\/terms\/([^/]+)/)?.[1] ?? terms[0]?.id;
  const studentsHref = activeTermId ? `/terms/${activeTermId}/roster` : "/";
  const classesHref = activeTermId ? `/terms/${activeTermId}` : "/";
  const termHref = activeTermId ? `/terms/${activeTermId}/term` : "/";

  const studentsActive =
    !!activeTermId &&
    (pathname === `/terms/${activeTermId}/roster` || pathname.startsWith(`/terms/${activeTermId}/students/`));
  const classesActive =
    !!activeTermId && (pathname === `/terms/${activeTermId}` || pathname.startsWith(`/terms/${activeTermId}/sessions/`));
  const termActive = pathname === `/terms/${activeTermId}/term`;
  const homeActive = pathname === "/";
  const profileActive = pathname === "/account";

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const report = () => {
      onHeightChange?.(homeActive ? 0 : nav.offsetHeight);
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(nav);
    window.addEventListener("resize", report);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [homeActive, onHeightChange]);

  const tabs = [
    { href: "/", label: t("common.home"), icon: House, active: homeActive },
    { href: termHref, label: t("dashboard.term"), icon: BookOpenCheck, active: termActive },
    { href: classesHref, label: t("sessions.title"), icon: CalendarRange, active: classesActive },
    { href: studentsHref, label: t("roster.title"), icon: Users, active: studentsActive },
    { href: "/account", label: t("account.title"), icon: Settings, active: profileActive },
  ];

  return (
    <nav
      ref={navRef}
      aria-label="Mobile navigation"
      aria-hidden={homeActive}
      inert={homeActive || undefined}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pt-1 backdrop-blur transition-transform duration-200 ease-in-out lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95 ${
        homeActive ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <ul className="grid grid-cols-5 gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-md px-1 text-[11px] leading-tight ${
                active
                  ? "text-[#0f6e56] dark:text-teal-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="mb-0.5 h-4.5 w-4.5" aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
