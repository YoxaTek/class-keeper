import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DeleteAccountSection } from "./DeleteAccountSection";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("account");
  const tCommon = await getTranslations("common");
  const tBilling = await getTranslations("billing");

  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const displayName = user.name || user.email;
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = tCommon(`role.${user.role}`);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          {user.image ? (
            <Image src={user.image} alt="" width={40} height={40} className="rounded-full" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f6e56] text-sm font-medium text-white">
              {initial}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{roleLabel}</p>
          </div>
        </div>
        <SignOutButton label={tCommon("signOut")} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{tCommon("language")}</p>
        <LanguageSwitcher />
      </div>

      {user.role === "TEACHER" && (
        <Link
          href="/billing"
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <CreditCard className="h-4 w-4" aria-hidden />
          {tBilling("title")}
        </Link>
      )}

      <DeleteAccountSection email={user.email} hasPassword={!!passwordHash} />
    </div>
  );
}
