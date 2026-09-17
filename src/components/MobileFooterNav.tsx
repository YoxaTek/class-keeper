"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, House, Settings, Users } from "lucide-react";

export function MobileFooterNav({ terms }: { terms: { id: string; label: string }[] }) {
  const t = useTranslations();
  const pathname = usePathname();

  const activeTermId = pathname.match(/^\/terms\/([^/]+)/)?.[1] ?? terms[0]?.id;
  const studentsHref = activeTermId ? `/terms/${activeTermId}/roster` : "/";
  const classesHref = activeTermId ? `/terms/${activeTermId}` : "/";

  const studentsActive =
    !!activeTermId &&
    (pathname === `/terms/${activeTermId}/roster` || pathname.startsWith(`/terms/${activeTermId}/students/`));
  const classesActive = !!activeTermId && (pathname === `/terms/${activeTermId}` || pathname.startsWith(`/terms/${activeTermId}/sessions/`));
  const homeActive = pathname === "/";
  const profileActive = pathname === "/account";

  const tabs = [
    { href: "/", label: t("dashboard.title"), icon: House, active: homeActive },
    { href: classesHref, label: t("sessions.title"), icon: CalendarRange, active: classesActive },
    { href: studentsHref, label: t("roster.title"), icon: Users, active: studentsActive },
    { href: "/account", label: t("account.title"), icon: Settings, active: profileActive },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      aria-hidden={homeActive}
      inert={homeActive || undefined}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pt-1 backdrop-blur transition-transform duration-200 ease-in-out lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95 ${
        homeActive ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <ul className="grid grid-cols-4 gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
