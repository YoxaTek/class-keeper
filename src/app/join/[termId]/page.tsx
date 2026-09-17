import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { JoinForm } from "./JoinForm";

export default async function JoinTermPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
    select: { id: true, name: true, institute: true, subject: { select: { name: true } } },
  });
  if (!term) notFound();

  const t = await getTranslations("join");
  const tCommon = await getTranslations("common");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {term.subject.name} · {term.name}
            {term.institute && ` · ${term.institute}`}
          </p>
        </div>

        <JoinForm termId={term.id} />
      </div>
    </AuthShell>
  );
}
