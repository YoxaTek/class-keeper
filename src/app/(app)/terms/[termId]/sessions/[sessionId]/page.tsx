import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ClassDetailTable } from "./ClassDetailTable";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ termId: string; sessionId: string }>;
}) {
  const { termId, sessionId } = await params;
  const { term } = await requireTermAccess(termId);
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const [session, enrollments] = await Promise.all([
    prisma.session.findUnique({ where: { id: sessionId, termId } }),
    prisma.enrollment.findMany({
      where: { termId },
      include: {
        student: true,
        attendance: { where: { sessionId } },
        scores: { where: { sessionId } },
        sessionFeedback: { where: { sessionId } },
      },
      orderBy: { student: { name: "asc" } },
    }),
  ]);
  if (!session) notFound();

  const sessionLabel = session.label ?? dateFmt.format(session.date);

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: term.name, href: `/terms/${termId}` },
          { label: t("sessions.title"), href: `/terms/${termId}` },
          { label: sessionLabel },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{sessionLabel}</h2>
        <p className="tabular text-sm text-zinc-500 dark:text-zinc-500">{dateFmt.format(session.date)}</p>
      </div>

      <ClassDetailTable sessionId={sessionId} session={session} enrollments={enrollments} />
    </div>
  );
}
