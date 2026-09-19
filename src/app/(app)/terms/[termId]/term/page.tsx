import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarRange, ChevronRight, GraduationCap, Users } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cardClass } from "@/components/ui/styles";
import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { TermFormDrawer } from "../../../TermFormDrawer";
import { TermDeleteButton } from "../../../TermDeleteButton";
import { InviteCoTeacherForm } from "../../../InviteCoTeacherForm";
import { InviteTAForm } from "../roster/InviteTAForm";

export default async function TermDetailPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const { user } = await requireTermAccess(termId);
  const t = await getTranslations("dashboard");
  const tAll = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const term = await prisma.term.findUniqueOrThrow({
    where: { id: termId },
    include: { subject: true, _count: { select: { enrollments: true, sessions: true } } },
  });

  const weights = [
    { label: t("weightAttendance"), value: term.weightAttendance },
    { label: t("weightAssignment"), value: term.weightAssignment },
    { label: t("weightQuiz"), value: term.weightQuiz },
    { label: t("weightMidterm"), value: term.weightMidterm },
    { label: t("weightFinal"), value: term.weightFinal },
    { label: t("weightImpression"), value: term.weightImpression },
  ];
  const totalWeight = weights.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t("term") }]} />

      <section className={`${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{term.subject.name}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{term.name}</p>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {dateFmt.format(term.startDate)} - {dateFmt.format(term.endDate)}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              {t("institute")}: <span className="text-zinc-700 dark:text-zinc-300">{term.institute || "-"}</span>
            </p>
          </div>

          {term.teacherId === user.id && (
            <div className="flex items-center gap-1">
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
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Link
          href={`/terms/${term.id}/roster`}
          className={`${cardClass} block p-4 transition-colors hover:border-[#0f6e56]/50 active:bg-zinc-50 dark:active:bg-zinc-800/60`}
        >
          <p className="flex items-center justify-between gap-1.5 text-xs uppercase tracking-wide text-[#0f6e56] dark:text-teal-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("students")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{term._count.enrollments}</p>
        </Link>

        <Link
          href={`/terms/${term.id}`}
          className={`${cardClass} block p-4 transition-colors hover:border-[#0f6e56]/50 active:bg-zinc-50 dark:active:bg-zinc-800/60`}
        >
          <p className="flex items-center justify-between gap-1.5 text-xs uppercase tracking-wide text-[#0f6e56] dark:text-teal-400">
            <span className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tAll("sessions.title")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{term._count.sessions}</p>
        </Link>

        <article className={`${cardClass} p-4`}>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("passingScore")}
          </p>
          <p className="mt-2 tabular text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{term.passingScore}</p>
        </article>
      </section>

      <section>
        <article className={`${cardClass} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("weights")}</h2>
            <span
              className={`tabular rounded-full px-2 py-0.5 text-xs font-medium ${
                totalWeight === 100
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {totalWeight}/100
            </span>
          </div>
          {weights.map((weight) => (
            <div
              key={weight.label}
              className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800"
            >
              <p className="text-zinc-700 dark:text-zinc-300">{weight.label}</p>
              <p className="tabular font-medium text-zinc-900 dark:text-zinc-100">{weight.value}%</p>
            </div>
          ))}
        </article>
      </section>

      {user.role === "TEACHER" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <InviteTAForm termId={term.id} />
          {user.organizationId && <InviteCoTeacherForm />}
        </section>
      )}
    </div>
  );
}