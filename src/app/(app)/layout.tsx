import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser, getStaffCourses } from "@/lib/currentUser";
import { SignOutButton } from "@/components/SignOutButton";
import { AppShell } from "@/components/AppShell";
import { AdSlot } from "@/components/AdSlot";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.onboardingComplete) redirect("/onboarding");

  const t = await getTranslations();
  const isStaff = user.role === "TEACHER" || user.role === "TA";

  if (!isStaff) {
    // Students get the simple shell — just the top bar, no course-scoped
    // sidebar since they only ever see their own read-only summary.
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Image src="/icon-512.png" alt="" width={20} height={20} className="rounded-sm" />
            {t("common.appName")}
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/account"
              className="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {t("account.title")}
            </Link>
            <SignOutButton label={t("common.signOut")} />
          </nav>
        </header>
        <AdSlot />
        <main className="flex-1 px-4 py-4">{children}</main>
      </div>
    );
  }

  const courses = await getStaffCourses();

  return (
    <AppShell name={user.name} email={user.email} image={user.image} role={user.role} courses={courses}>
      {children}
    </AppShell>
  );
}
