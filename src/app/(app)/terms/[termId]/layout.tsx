import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { DeleteTermButton } from "./DeleteTermButton";

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

  const tabs = [
    { href: `/terms/${termId}`, label: t("sessions.title") },
    { href: `/terms/${termId}/roster`, label: t("roster.title") },
    { href: `/terms/${termId}/grid`, label: t("grid.title") },
    { href: `/terms/${termId}/below-passing`, label: t("belowPassing.title") },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {term.subject.name} · {term.name}
        </h1>
        {term.teacherId === session.user.id && (
          <DeleteTermButton termId={termId} termLabel={`${term.subject.name} · ${term.name}`} />
        )}
      </div>
      <nav className="flex gap-4 border-b border-black/10 text-sm dark:border-white/10">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="pb-2">
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
