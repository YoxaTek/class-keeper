"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, Users, CalendarRange, TriangleAlert } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const termMatch = pathname.match(/^\/terms\/([^/]+)/);
  const termId = termMatch?.[1];

  if (!termId) return null;

  const items: NavItem[] = [
    { href: "/", label: t("dashboard.title"), icon: LayoutGrid },
    { href: `/terms/${termId}/roster`, label: t("roster.title"), icon: Users },
    { href: `/terms/${termId}`, label: t("sessions.title"), icon: CalendarRange },
    { href: `/terms/${termId}/below-passing`, label: t("belowPassing.title"), icon: TriangleAlert },
  ];

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="flex-1 space-y-0.5 p-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
                active
                  ? "bg-[#0f6e56]/10 font-medium text-[#0f6e56] dark:text-teal-400"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
