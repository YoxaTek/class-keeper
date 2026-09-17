import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { TermFormDrawer } from "./TermFormDrawer";
import { InviteCoTeacherForm } from "./InviteCoTeacherForm";
import { TermDeleteButton } from "./TermDeleteButton";

export default async function DashboardPage() {
  const { id: userId, role, organizationId } = await getCurrentUser();
  if (role === "STUDENT") redirect("/me");

  const terms = await prisma.term.findMany({
    where:
      role === "TEACHER"
        ? { teacherId: userId }
        : { assistants: { some: { userId } } },
    include: { subject: true, _count: { select: { enrollments: true } } },
    orderBy: { startDate: "desc" },
  });

  const t = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>
        {role === "TEACHER" && <TermFormDrawer mode="create" />}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-4 py-2">{t("term")}</th>
              <th className="px-4 py-2">{t("subject")}</th>
              <th className="px-4 py-2">{t("dates")}</th>
              <th className="px-4 py-2 text-right">{t("students")}</th>
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950">
            {terms.map((term) => (
              <tr key={term.id} className="group border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900">
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="block px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {term.name}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="block px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {term.subject.name}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="tabular block px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                    {dateFmt.format(term.startDate)} – {dateFmt.format(term.endDate)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/terms/${term.id}`} className="tabular block px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-500">
                    {term._count.enrollments}
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right">
                  {term.teacherId === userId && (
                    <div className="flex items-center justify-end gap-1">
                      <TermFormDrawer
                        mode="edit"
                        termId={term.id}
                        initial={{
                          subjectName: term.subject.name,
                          name: term.name,
                          startDate: term.startDate.toISOString().slice(0, 10),
                          endDate: term.endDate.toISOString().slice(0, 10),
                          weightAttendance: term.weightAttendance,
                          weightAssignment: term.weightAssignment,
                          weightQuiz: term.weightQuiz,
                          weightMidterm: term.weightMidterm,
                          weightFinal: term.weightFinal,
                          weightImpression: term.weightImpression,
                          maxExcusedAbsences: term.maxExcusedAbsences,
                          passingScore: term.passingScore,
                          institute: term.institute ?? "",
                        }}
                      />
                      <TermDeleteButton termId={term.id} termLabel={`${term.subject.name} · ${term.name}`} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
                  {role === "TA" ? t("taPending") : "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {role === "TEACHER" && organizationId && <InviteCoTeacherForm />}
    </div>
  );
}
