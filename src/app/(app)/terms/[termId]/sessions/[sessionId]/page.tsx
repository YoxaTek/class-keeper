import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { SessionForm } from "@/components/SessionForm";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ termId: string; sessionId: string }>;
}) {
  const { termId, sessionId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations("sessions");

  const session = await prisma.session.findUnique({ where: { id: sessionId, termId } });
  if (!session) notFound();

  return (
    <div className="space-y-4">
      <h2 className="font-medium">{t("editTitle")}</h2>
      <SessionForm
        termId={termId}
        sessionId={sessionId}
        initial={{
          date: session.date.toISOString().slice(0, 10),
          label: session.label ?? "",
          hasAttendance: session.hasAttendance,
          hasQuiz: session.hasQuiz,
          hasAssignment: session.hasAssignment,
          hasMidterm: session.hasMidterm,
          hasFinal: session.hasFinal,
        }}
      />
    </div>
  );
}
