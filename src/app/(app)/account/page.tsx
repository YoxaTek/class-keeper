import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountSection } from "./DeleteAccountSection";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const t = await getTranslations("account");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
      <DeleteAccountSection email={user.email} hasPassword={!!user.passwordHash} />
    </div>
  );
}
