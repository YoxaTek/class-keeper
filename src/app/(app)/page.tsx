import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TermCreateForm } from "./TermCreateForm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "STUDENT") redirect("/me");

  const { id: userId, role } = session.user;

  const [terms, subjects] = await Promise.all([
    prisma.term.findMany({
      where:
        role === "TEACHER"
          ? { teacherId: userId }
          : { assistants: { some: { userId } } },
      include: { subject: true, _count: { select: { enrollments: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const t = await getTranslations("dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </div>

      <ul className="divide-y divide-black/10 rounded border border-black/10 dark:divide-white/10 dark:border-white/10">
        {terms.map((term) => (
          <li key={term.id}>
            <Link
              href={`/terms/${term.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
            >
              <span>
                <span className="font-medium">{term.subject.name}</span>
                <span className="text-black/60 dark:text-white/60"> · {term.name}</span>
              </span>
              <span className="text-sm text-black/60 dark:text-white/60">
                {term._count.enrollments} {t("students").toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
        {terms.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-black/60 dark:text-white/60">—</li>
        )}
      </ul>

      {role === "TEACHER" && <TermCreateForm subjects={subjects} />}
    </div>
  );
}
