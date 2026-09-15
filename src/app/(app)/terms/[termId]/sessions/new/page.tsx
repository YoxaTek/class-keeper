import { getTranslations } from "next-intl/server";
import { requireTermAccess } from "@/lib/termAccess";
import { SessionForm } from "@/components/SessionForm";

export default async function NewSessionPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);
  const t = await getTranslations("sessions");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("newTitle")}</h2>
      <SessionForm termId={termId} />
    </div>
  );
}
