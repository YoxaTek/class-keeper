import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JoinLinkCard } from "@/components/JoinLinkCard";
import { RosterTable } from "./RosterTable";
import { BulkAddForm } from "./BulkAddForm";
import { InviteTAForm } from "./InviteTAForm";

export default async function RosterPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const { user } = await requireTermAccess(termId);
  const t = await getTranslations("roster");

  const enrollments = await prisma.enrollment.findMany({
    where: { termId },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });

  return (
    <div>
      <Breadcrumb items={[{ label: t("title") }]} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h2>
            <span className="tabular text-xs text-zinc-500 dark:text-zinc-500">{enrollments.length} / 30</span>
          </div>
          <RosterTable termId={termId} enrollments={enrollments} />
        </div>

        <div className="space-y-4">
          <JoinLinkCard termId={termId} />
          {enrollments.length >= 30 ? (
            <p className="text-sm text-amber-700 dark:text-amber-500">{t("capReached")}</p>
          ) : (
            <BulkAddForm termId={termId} remaining={30 - enrollments.length} />
          )}
          {user.role === "TEACHER" && <InviteTAForm termId={termId} />}
        </div>
      </div>
    </div>
  );
}
