import { getTranslations } from "next-intl/server";
import { CalendarRange, Users, Table2, TriangleAlert } from "lucide-react";
import { requireTermAccess } from "@/lib/termAccess";
import { DeleteTermButton } from "./DeleteTermButton";
import { TermTabs } from "./TermTabs";

export default async function TermLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ termId: string }>;
}) {
  const { termId } = await params;
  const { session, term } = await requireTermAccess(termId);
  const t = await getTranslations();

  // Icon component references (functions) can't cross the server/client
  // boundary as props — pass already-rendered elements instead.
  const iconClass = "h-4 w-4";
  const tabs = [
    { href: `/terms/${termId}`, label: t("sessions.title"), icon: <CalendarRange className={iconClass} aria-hidden /> },
    { href: `/terms/${termId}/roster`, label: t("roster.title"), icon: <Users className={iconClass} aria-hidden /> },
    { href: `/terms/${termId}/grid`, label: t("grid.title"), icon: <Table2 className={iconClass} aria-hidden /> },
    {
      href: `/terms/${termId}/below-passing`,
      label: t("belowPassing.title"),
      icon: <TriangleAlert className={iconClass} aria-hidden />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {term.subject.name} <span className="text-zinc-400 dark:text-zinc-600">·</span> {term.name}
        </h1>
        {term.teacherId === session.user.id && (
          <DeleteTermButton termId={termId} termLabel={`${term.subject.name} · ${term.name}`} />
        )}
      </div>
      <TermTabs tabs={tabs} />
      {children}
    </div>
  );
}
