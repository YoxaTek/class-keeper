import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ClassFormDrawer } from "./ClassFormDrawer";
import { ClassDeleteButton } from "./ClassDeleteButton";
import { ExportSessionPdfButton } from "./ExportSessionPdfButton";
import { scoreRecordMax, pctFor } from "@/lib/grading/calculateGrade";
import { buildClassRecordTitle, courseWeekNumber } from "@/lib/classRecordTitle";

type Filter = "all" | "upcoming" | "past";

// A session's own turnout isn't tied to any per-student passing threshold
// (that's a whole-course, whole-term concept) — this is just "did most of
// the class show up that day", flagged the same red the rest of the app
// uses for anything below par.
const LOW_ATTENDANCE_THRESHOLD = 50;

export default async function SessionsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { courseId } = await params;
  const { course } = await requireCourseAccess(courseId);
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = rawFilter === "upcoming" || rawFilter === "past" ? rawFilter : "all";
  const t = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const [allSessions, rosterEnrollments] = await Promise.all([
    prisma.session.findMany({
      where: { courseId },
      include: { attendance: true, scores: true, feedback: true, assessments: true },
      orderBy: { date: "asc" },
    }),
    // For the per-row PDF export — fetched once and reused across every
    // session card instead of each one re-querying the same roster.
    prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
  ]);
  const pdfEnrollments = rosterEnrollments.map((e) => ({ id: e.id, student: e.student }));
  const weekNumberBySessionId = new Map(allSessions.map((s) => [s.id, courseWeekNumber(course.startDate, s.date)]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingSessions = allSessions.filter((s) => s.date >= today);
  const pastSessions = allSessions.filter((s) => s.date < today);
  const sessions = filter === "upcoming" ? upcomingSessions : filter === "past" ? pastSessions : allSessions;

  // One pill per cover rather than a joined string — scannable at a glance
  // instead of read word by word.
  const covers = (s: (typeof sessions)[number]) =>
    [
      s.hasAttendance && t("sessions.attendance"),
      s.assessments.some((a) => a.type === "QUIZ") && t("sessions.quiz"),
      s.assessments.some((a) => a.type === "ASSIGNMENT") && t("sessions.assignment"),
      s.hasMidterm && t("sessions.midterm"),
      s.hasFinal && t("sessions.final"),
      s.hasFeedback && t("sessions.feedback"),
    ].filter((label): label is string => Boolean(label));

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t("sessions.filterAll"), count: allSessions.length },
    { key: "upcoming", label: t("sessions.filterUpcoming"), count: upcomingSessions.length },
    { key: "past", label: t("sessions.filterPast"), count: pastSessions.length },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Breadcrumb items={[{ label: t("sessions.title") }]} />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? `/courses/${courseId}` : `/courses/${courseId}?filter=${f.key}`}
              className={`tabular rounded-md px-2.5 py-1.5 text-[11.5px] ${
                filter === f.key
                  ? "bg-[#0f6e56]/10 font-bold text-[#0f6e56] dark:text-teal-400"
                  : "font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
              }`}
            >
              {f.label} ({f.count})
            </Link>
          ))}
        </div>
        <ClassFormDrawer mode="create" courseId={courseId} />
      </div>

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s) => {
            // The denominator is the roster actually enrolled as of this
            // session's date, not "however many Attendance rows happen to
            // exist" — a student missing a backfilled row (e.g. enrolled
            // before ensureAttendanceForSession existed) would otherwise
            // silently drop out of the denominator and inflate turnout.
            const enrolledCount = rosterEnrollments.length;
            const present = s.attendance.filter((a) => a.status === "PRESENT" || a.status === "EXCUSED").length;
            const turnoutPct = enrolledCount ? Math.round((present / enrolledCount) * 100) : null;
            const turnout = turnoutPct === null ? "—" : `${turnoutPct}%`;
            const turnoutLow = s.hasAttendance && turnoutPct !== null && turnoutPct < LOW_ATTENDANCE_THRESHOLD;
            const assessmentsById = new Map(s.assessments.map((a) => [a.id, a]));
            const scoreAvg = s.scores.length
              ? `${(
                  s.scores.reduce((sum, r) => sum + pctFor(r, scoreRecordMax(r, s, assessmentsById)), 0) /
                  s.scores.length
                ).toFixed(1)}%`
              : "—";

            const href = `/courses/${courseId}/sessions/${s.id}`;
            const coverLabels = covers(s);

            return (
              <article
                key={s.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={href} className="min-w-0 flex-1">
                    <p className="tabular text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                      {dateFmt.format(s.date)}
                    </p>
                    {s.label && <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">{s.label}</p>}
                  </Link>
                  {/* Actions live in the header now, not a separate footer row — no
                      room left for the old chevron-as-affordance once PDF/edit/delete
                      moved up here, so the card itself (below) carries that instead. */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <ExportSessionPdfButton
                      title={buildClassRecordTitle({
                        courseName: course.name,
                        subjectName: course.subject.name,
                        weekNumber: weekNumberBySessionId.get(s.id)!,
                        date: s.date,
                      })}
                      session={s}
                      assessments={s.assessments}
                      enrollments={pdfEnrollments}
                      attendance={s.attendance}
                      scores={s.scores}
                      sessionFeedback={s.feedback}
                    />
                    <ClassFormDrawer
                      mode="edit"
                      courseId={courseId}
                      sessionId={s.id}
                      initial={{
                        date: s.date.toISOString().slice(0, 10),
                        label: s.label ?? "",
                        hasAttendance: s.hasAttendance,
                        hasMidterm: s.hasMidterm,
                        midtermMaxScore: s.midtermMaxScore,
                        hasFinal: s.hasFinal,
                        finalMaxScore: s.finalMaxScore,
                        hasFeedback: s.hasFeedback,
                        quizzes: s.assessments
                          .filter((a) => a.type === "QUIZ")
                          .sort((a, b) => a.order - b.order)
                          .map((a) => ({ id: a.id, label: a.label ?? "", maxScore: a.maxScore })),
                        assignments: s.assessments
                          .filter((a) => a.type === "ASSIGNMENT")
                          .sort((a, b) => a.order - b.order)
                          .map((a) => ({ id: a.id, label: a.label ?? "", maxScore: a.maxScore })),
                      }}
                    />
                    <ClassDeleteButton courseId={courseId} sessionId={s.id} />
                  </div>
                </div>

                <Link href={href} className="mt-2.5 block space-y-2.5">
                  {coverLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {coverLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500">—</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Healthy turnout gets the same teal tint as an active filter
                        pill, not a neutral gray — a session with no attendance
                        problem is still worth reading as "good", not "no signal". */}
                    <span
                      className={`tabular rounded-full px-2 py-0.5 text-[12px] font-bold ${
                        turnoutLow
                          ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400"
                          : "bg-[#0f6e56]/10 text-[#0f6e56] dark:text-teal-400"
                      }`}
                    >
                      {s.hasAttendance ? `${turnout} ${t("sessions.attendanceTurnout").toLowerCase()}` : "—"}
                    </span>
                    {(s.assessments.length > 0 || s.hasMidterm || s.hasFinal) && (
                      <span className="tabular text-[12px] text-zinc-500 dark:text-zinc-500">
                        {scoreAvg} {t("sessions.scoreAverage").toLowerCase()}
                      </span>
                    )}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
          {t("sessions.empty", { button: t("sessions.newSession") })}
        </div>
      )}
    </div>
  );
}
