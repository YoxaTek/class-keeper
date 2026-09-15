import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TermCreateForm } from "./TermCreateForm";
import { InviteCoTeacherForm } from "./InviteCoTeacherForm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "STUDENT") redirect("/me");

  const { id: userId, role, organizationId } = session.user;

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
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-4 py-2">{t("subject")}</th>
              <th className="px-4 py-2">{t("term")}</th>
              <th className="px-4 py-2">{t("dates")}</th>
              <th className="px-4 py-2 text-right">{t("students")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
            {terms.map((term) => (
              <tr key={term.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900">
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="block px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {term.subject.name}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="block px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {term.name}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="tabular block px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                    {dateFmt.format(term.startDate)} – {dateFmt.format(term.endDate)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={`/terms/${term.id}`}
                    className="tabular flex items-center justify-end gap-1.5 px-4 py-2.5 text-zinc-500 dark:text-zinc-500"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {term._count.enrollments}
                  </Link>
                </td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
                  {role === "TA" ? t("taPending") : "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {role === "TEACHER" && <TermCreateForm subjects={subjects} />}
      {role === "TEACHER" && organizationId && <InviteCoTeacherForm />}
    </div>
  );
}
