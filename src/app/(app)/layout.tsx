import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <Link href="/" className="font-semibold">
          {t("common.appName")}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {isStaff && <Link href="/">{t("nav.terms")}</Link>}
          <LanguageSwitcher />
          <SignOutButton label={t("common.signOut")} />
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
