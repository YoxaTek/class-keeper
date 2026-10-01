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
import { cardHoverClass } from "@/components/ui/styles";
import css from "./classes.module.scss";

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
    <div className={css.page}>
      <Breadcrumb items={[{ label: t("sessions.title") }]} />

      <div className={css.toolbar}>
        <div className={css.filters}>
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? `/courses/${courseId}` : `/courses/${courseId}?filter=${f.key}`}
              className={`tabular ${css.filter} ${filter === f.key ? css.active : ""}`}
            >
              {f.label} ({f.count})
            </Link>
          ))}
        </div>
        <ClassFormDrawer mode="create" courseId={courseId} />
      </div>

      {sessions.length > 0 ? (
        <div className={css.grid}>
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
              <article key={s.id} className={cardHoverClass}>
                <div className={css.head}>
                  <Link href={href} className={css.when}>
                    <p className={`tabular ${css.date}`}>
                      {dateFmt.format(s.date)}
                    </p>
                    {s.label && <p className={css.label}>{s.label}</p>}
                  </Link>
                  {/* Actions live in the header now, not a separate footer row — no
                      room left for the old chevron-as-affordance once PDF/edit/delete
                      moved up here, so the card itself (below) carries that instead. */}
                  <div className={css.actions}>
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

                <Link href={href} className={css.body}>
                  {coverLabels.length > 0 ? (
                    <div className={css.covers}>
                      {coverLabels.map((label) => (
                        <span key={label} className={css.cover}>
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={css.none}>—</p>
                  )}
                  <div className={css.stats}>
                    {/* Healthy turnout gets the same teal tint as an active filter
                        pill, not a neutral gray — a session with no attendance
                        problem is still worth reading as "good", not "no signal". */}
                    <span
                      className={`tabular ${css.turnout} ${turnoutLow ? css.low : ""}`}
                    >
                      {s.hasAttendance ? `${turnout} ${t("sessions.attendanceTurnout").toLowerCase()}` : "—"}
                    </span>
                    {(s.assessments.length > 0 || s.hasMidterm || s.hasFinal) && (
                      <span className={`tabular ${css.average}`}>
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
        <div className={css.empty}>
          {t("sessions.empty", { button: t("sessions.newSession") })}
        </div>
      )}
    </div>
  );
}
