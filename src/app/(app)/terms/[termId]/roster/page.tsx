import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { RosterTable } from "./RosterTable";
import { BulkAddForm } from "./BulkAddForm";

export default async function RosterPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations("roster");

  const enrollments = await prisma.enrollment.findMany({
    where: { termId },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <RosterTable termId={termId} enrollments={enrollments} />
      {enrollments.length >= 30 ? (
        <p className="text-sm text-amber-600">{t("capReached")}</p>
      ) : (
        <BulkAddForm termId={termId} remaining={30 - enrollments.length} />
      )}
    </div>
  );
}
