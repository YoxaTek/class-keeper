import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { BookOpenCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Role/onboardingComplete live in the JWT session cookie, which is only
  // re-minted on sign-in or an explicit client-side session update — it does
  // NOT reflect a role change or onboarding completion that just happened
  // moments ago in the same visit. Read the current values straight from
  // the DB here rather than trusting the (possibly stale) cached session,
  // so completing onboarding or accepting an invite never leaves someone
  // stuck bouncing back to /onboarding.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true, onboardingComplete: true },
  });
  if (!user.onboardingComplete) redirect("/onboarding");

  const t = await getTranslations();
  const isStaff = user.role === "TEACHER" || user.role === "TA";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Image src="/icon-512.png" alt="" width={20} height={20} className="rounded-sm" />
          {t("common.appName")}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {isStaff && (
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden />
              {t("nav.terms")}
            </Link>
          )}
          <LanguageSwitcher />
          <SignOutButton label={t("common.signOut")} />
        </nav>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
