import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const t = await getTranslations();
  const isStaff = session.user.role === "TEACHER" || session.user.role === "TA";

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
