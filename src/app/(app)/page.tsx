import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  ListChecks,
  Sparkles,
  Clock,
  NotebookPen,
  TriangleAlert,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { computeGradesForCourse } from "@/lib/grading/computeCourseGrades";
import { QrScannerButton } from "@/components/QrScanner";
import { CourseFormDrawer } from "./CourseFormDrawer";
import { CourseDeleteButton } from "./CourseDeleteButton";
import { courseFormInitial } from "@/lib/courseForm";
import { cardHoverClass } from "@/components/ui/styles";
import { CourseSummary, courseStripeClass } from "@/components/CourseSummary";
import s from "./dashboard.module.scss";

const MAX_AVATARS = 3;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export default async function DashboardPage() {
  const { id: userId, role, name } = await getCurrentUser();
  if (role === "STUDENT") redirect("/me");

  const courses = await prisma.course.findMany({
    where: role === "TEACHER" ? { teacherId: userId } : { assistants: { some: { userId } } },
    include: {
      subject: true,
      _count: { select: { enrollments: true } },
      sessions: { select: { id: true, date: true }, orderBy: { date: "asc" } },
    },
    orderBy: { startDate: "desc" },
  });

  // One extra query per course for the cohort numbers — a teacher's course
  // list is small (single digits), so this stays cheap without needing
  // computeGradesForCourse to take a pre-fetched course.
  const summaries = new Map(
    await Promise.all(
      courses.map(async (course) => {
        const { results } = await computeGradesForCourse(course.id);
        const totalMax =
          course.weightAttendance +
          course.weightAssignment +
          course.weightQuiz +
          course.weightMidterm +
          course.weightFinal +
          course.weightImpression;
        const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
        return [
          course.id,
          {
            hasStudents: results.length > 0,
            attendancePct: results.length ? Math.round(mean(results.map((r) => r.grade.attendance.pct)) * 100) : 0,
            avgScorePct:
              results.length && totalMax > 0 ? Math.round(mean(results.map((r) => r.grade.total / totalMax)) * 100) : 0,
            belowPassingCount: results.filter((r) => !r.grade.passing).length,
            students: results.map((r) => r.enrollment.student.name),
          },
        ] as const;
      }),
    ),
  );

  const t = await getTranslations("dashboard");

  const firstName = (name ?? "").trim().split(/\s+/)[0] || t("teacherFallback");
  const enrolledTotal = courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  // Quick actions jump to a concrete class on the first course: today's
  // (or the next upcoming) for attendance, the most recent past one for
  // entering scores; else the course's class list.
  const quickCourse = courses[0];
  const todayKey = new Date().toISOString().slice(0, 10);
  const sessionHref = (id?: string) => (quickCourse ? `/courses/${quickCourse.id}${id ? `/sessions/${id}` : ""}` : "/");
  const attendanceSession = quickCourse?.sessions.find((x) => x.date.toISOString().slice(0, 10) >= todayKey);
  const gradingSession = [...(quickCourse?.sessions ?? [])]
    .reverse()
    .find((x) => x.date.toISOString().slice(0, 10) <= todayKey);

  const isEmpty = courses.length === 0;
  const steps = [1, 2, 3, 4] as const;

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={s.heroText}>
          <h1 className={s.title}>{t(isEmpty ? "welcomeNew" : "welcomeBack", { name: firstName })}</h1>
          <p className={s.heroSub}>{t(isEmpty ? "emptySubtitle" : "heroSubtitle")}</p>
          <div className={s.chips}>
            <span className={s.chip}>
              <BookOpen aria-hidden />
              {t("activeCourses", { count: courses.length })}
            </span>
            <span className={s.chip}>
              <Users aria-hidden />
              {t("enrolledStudents", { count: enrolledTotal })}
            </span>
          </div>
        </div>
        <div className={s.heroIcon}>
          <BookOpenCheck aria-hidden />
        </div>
      </section>

      {isEmpty ? (
        <>
          <section className={`${s.launch} ${s.panel}`}>
            <span className={s.launchIcon}>
              <BookOpen aria-hidden />
              <span className={s.sparkle}>
                <Sparkles aria-hidden />
              </span>
            </span>
            {role === "TEACHER" ? (
              <>
                <h2 className={s.launchTitle}>{t("launchTitle")}</h2>
                <p className={s.launchBody}>{t("launchBody")}</p>
              </>
            ) : (
              <p className={s.launchBody}>{t("taPending")}</p>
            )}
            <div className={s.launchActions}>
              {role === "TEACHER" && <CourseFormDrawer mode="create" triggerLabel={t("createFirstCourse")} />}
              <QrScannerButton
                triggerLabel={t("acceptInvite")}
                title={t("acceptInviteTitle")}
                helpText={t("acceptInviteHelp")}
                variant="secondary"
                className={s.nowrap}
              />
            </div>
          </section>

          {role === "TEACHER" && (
            <section className={`${s.steps} ${s.panel}`}>
              <div className={s.stepsHead}>
                <span className={s.stepsIcon}>
                  <ListChecks aria-hidden />
                </span>
                <span className={s.quickSetup}>{t("quickSetup")}</span>
                <span className={s.guideTime}>
                  <Clock aria-hidden />
                  {t("guideMinutes")}
                </span>
              </div>
              <h2 className={s.stepsTitle}>{t("howItWorks")}</h2>
              <ol className={s.stepList}>
                {steps.map((n) => (
                  <li key={n}>
                    <span className={`${s.stepNumber} ${n === 1 ? s.first : ""}`}>{n}</span>
                    <div>
                      <strong>{t(`step${n}Title`)}</strong>
                      <p>{t(`step${n}Body`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className={s.stepsFoot}>
                <p className={s.sync}>
                  <span className={s.syncDot} aria-hidden />
                  {t("syncsAcross")}
                </p>
                <CourseFormDrawer mode="create" triggerLabel={t("createFirstCourseShort")} triggerClassName={s.cta} />
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className={`${s.actions} ${role === "TEACHER" ? "" : s.single}`}>
            {role === "TEACHER" && <CourseFormDrawer mode="create" />}
            <QrScannerButton
              triggerLabel={t("acceptInvite")}
              title={t("acceptInviteTitle")}
              helpText={t("acceptInviteHelp")}
              variant="secondary"
              className={s.nowrap}
            />
          </div>

          {courses.length > 0 && (
            <div className={s.list}>
              {courses.map((course) => {
                const summary = summaries.get(course.id)!;
                const conducted = course.sessions.filter((x) => x.date.toISOString().slice(0, 10) <= todayKey).length;
                const planned = Math.max(course.plannedSessions, course.sessions.length);

                return (
                  <article key={course.id} className={`${cardHoverClass} ${courseStripeClass(course.color)}`}>
                    <Link href={`/courses/${course.id}`} className={s.cardLink}>
                      <CourseSummary
                        course={course}
                        enrolled={course._count.enrollments}
                        conducted={conducted}
                        planned={planned}
                      />

                      {!summary.hasStudents ? (
                        <p className={s.invitePill}>
                          <UserPlus aria-hidden />
                          {t("inviteFirstStudent")}
                        </p>
                      ) : summary.belowPassingCount > 0 ? (
                        <div className={`${s.callout} ${s.alert}`}>
                          <TriangleAlert aria-hidden />
                          <span>{t("belowPassingCount", { count: summary.belowPassingCount })}</span>
                        </div>
                      ) : (
                        <div className={`${s.callout} ${s.health}`}>
                          <TrendingUp aria-hidden />
                          <span>
                            {t("cohortHealth")}: {t("avgShort")}{" "}
                            <strong className="tabular">{summary.avgScorePct}%</strong> · {t("attendanceShort")}{" "}
                            <strong className="tabular">{summary.attendancePct}%</strong>
                          </span>
                        </div>
                      )}
                    </Link>

                    <div className={s.foot}>
                      <div className={s.avatars} aria-hidden>
                        {summary.students.slice(0, MAX_AVATARS).map((student, i) => (
                          <span key={i} className={`${s.avatar} ${s[`a${i}`]}`}>
                            {initials(student)}
                          </span>
                        ))}
                        {summary.students.length > MAX_AVATARS && (
                          <span className={`${s.avatar} ${s.a3}`}>+{summary.students.length - MAX_AVATARS}</span>
                        )}
                      </div>

                      <div className={s.rowActions}>
                        {course.teacherId === userId && (
                          <>
                            <CourseFormDrawer mode="edit" courseId={course.id} initial={courseFormInitial(course)} />
                            <CourseDeleteButton
                              courseId={course.id}
                              courseLabel={`${course.subject.name} · ${course.name}`}
                            />
                          </>
                        )}
                        <Link href={`/courses/${course.id}`} className={s.open}>
                          {t("openWorkspace")}
                          <ArrowRight size={16} aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {quickCourse && (
            <section className={s.quick}>
              <h2 className={s.quickTitle}>{t("quickActions")}</h2>
              <div className={s.quickGrid}>
                <Link href={sessionHref(attendanceSession?.id)} className={`${cardHoverClass} ${s.tile}`}>
                  <span className={`${s.tileIcon} ${s.teal}`}>
                    <ClipboardCheck aria-hidden />
                  </span>
                  <strong>{t("markAttendance")}</strong>
                  <span>{t("markAttendanceHint")}</span>
                </Link>
                <Link href={sessionHref(gradingSession?.id)} className={`${cardHoverClass} ${s.tile}`}>
                  <span className={`${s.tileIcon} ${s.rust}`}>
                    <NotebookPen aria-hidden />
                  </span>
                  <strong>{t("gradebookEntry")}</strong>
                  <span>{t("gradebookEntryHint")}</span>
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
