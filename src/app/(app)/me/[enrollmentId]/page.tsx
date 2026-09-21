import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { cardClass } from "@/components/ui/styles";
import { GradeBreakdownCard } from "@/components/GradeBreakdownCard";
import { Breadcrumb } from "@/components/Breadcrumb";
import { assessmentDisplayLabel } from "@/lib/assessmentLabel";
import { FeedbackForm } from "../FeedbackForm";

function effectiveScore(record: { originalScore: number | null; retakeScore: number | null } | undefined) {
  if (!record) return null;
  return record.retakeScore ?? record.originalScore;
}

export default async function MyCoursePage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") redirect("/");

  const { enrollmentId } = await params;
  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");
  const tGrade = await getTranslations("studentDetail");
  const tSessions = await getTranslations("sessions");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: true,
      course: { include: { subject: true, sessions: { include: { assessments: true } } } },
      attendance: true,
      scores: true,
      evaluation: true,
      feedback: true,
      sessionFeedback: true,
    },
  });

  // Never trust a client-supplied enrollmentId without checking it's
  // actually this student's own — a guessed/adjacent id must 404, not leak
  // another student's grades.
  if (!enrollment || enrollment.student.userId !== user.id) notFound();

  const { course } = enrollment;
  const assessments = course.sessions.flatMap((s) =>
    s.assessments.map((a) => ({ id: a.id, sessionId: a.sessionId, type: a.type, maxScore: a.maxScore }))
  );
  const grade = calculateGrade({
    attendance: enrollment.attendance.map((a) => ({ status: a.status })),
    sessions: course.sessions.map((s) => ({
      id: s.id,
      hasMidterm: s.hasMidterm,
      midtermMaxScore: s.midtermMaxScore,
      hasFinal: s.hasFinal,
      finalMaxScore: s.finalMaxScore,
    })),
    assessments,
    scores: enrollment.scores.map((s) => ({
      sessionId: s.sessionId,
      category: s.category,
      assessmentId: s.assessmentId,
      originalScore: s.originalScore,
      retakeScore: s.retakeScore,
      retakeMaxScore: s.retakeMaxScore,
    })),
    impressionScore: enrollment.evaluation?.impressionScore ?? null,
    settings: {
      maxExcusedAbsences: course.maxExcusedAbsences,
      weightAttendance: course.weightAttendance,
      weightAssignment: course.weightAssignment,
      weightQuiz: course.weightQuiz,
      weightMidterm: course.weightMidterm,
      weightFinal: course.weightFinal,
      weightImpression: course.weightImpression,
      passingScore: course.passingScore,
      finalExamSessionId: course.finalExamSessionId,
    },
  });

  // Only sessions the student was actually PRESENT for, and only those
  // with a quiz, assignment, midterm, or final component.
  const attendanceBySession = new Map(enrollment.attendance.map((a) => [a.sessionId, a.status]));
  const byCategoryAndSession = (category: string) =>
    new Map(enrollment.scores.filter((s) => s.category === category).map((s) => [s.sessionId, s]));
  const scoreByAssessment = new Map(
    enrollment.scores.filter((s): s is typeof s & { assessmentId: string } => !!s.assessmentId).map((s) => [s.assessmentId, s])
  );
  const midtermReadingBySession = byCategoryAndSession("MIDTERM_READING");
  const midtermListeningBySession = byCategoryAndSession("MIDTERM_LISTENING");
  const finalBySession = byCategoryAndSession("FINAL");
  const feedbackBySession = new Map(enrollment.sessionFeedback.map((f) => [f.sessionId, f.note]));
  // A session earns a card if it has scores from a class the student was
  // PRESENT for, OR a TA/teacher left it session feedback — that can
  // happen for any session, present or not (e.g. a note about an
  // absence), so it isn't gated on attendance the way scores are.
  const cardSessions = course.sessions
    .filter(
      (s) =>
        ((s.assessments.length > 0 || s.hasMidterm || s.hasFinal) && attendanceBySession.get(s.id) === "PRESENT") ||
        feedbackBySession.has(s.id)
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Breadcrumb
        items={[
          { label: t("myCourses"), href: "/me" },
          { label: `${course.subject.name} · ${course.name}` },
        ]}
      />

      <GradeBreakdownCard
        grade={grade}
        weights={{
          attendance: course.weightAttendance,
          assignment: course.weightAssignment,
          quiz: course.weightQuiz,
          midterm: course.weightMidterm,
          final: course.weightFinal,
          impression: course.weightImpression,
        }}
        labels={{
          title: t("title"),
          passing: tGrade("passing"),
          belowPassing: tGrade("belowPassing"),
          attendance: tDashboard("weightAttendance"),
          assignment: tDashboard("weightAssignment"),
          quiz: tDashboard("weightQuiz"),
          midterm: tDashboard("weightMidterm"),
          final: tDashboard("weightFinal"),
          impression: tDashboard("weightImpression"),
        }}
      />

      {cardSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("sessionScores")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {cardSessions.map((s) => {
              // Only the categories this particular session actually has —
              // no placeholder dashes for ones it doesn't. Scores only show
              // for a session the student was PRESENT for; feedback can
              // appear either way (see cardSessions above).
              const items: { label: string; value: string }[] = [];
              if (attendanceBySession.get(s.id) === "PRESENT") {
                const quizzes = s.assessments.filter((a) => a.type === "QUIZ").sort((a, b) => a.order - b.order);
                quizzes.forEach((a, i) => {
                  items.push({
                    label: assessmentDisplayLabel(tSessions("quiz"), a, i, quizzes.length),
                    value: `${effectiveScore(scoreByAssessment.get(a.id)) ?? "—"} / ${a.maxScore}`,
                  });
                });
                const classAssignments = s.assessments.filter((a) => a.type === "ASSIGNMENT").sort((a, b) => a.order - b.order);
                classAssignments.forEach((a, i) => {
                  items.push({
                    label: assessmentDisplayLabel(tSessions("assignment"), a, i, classAssignments.length),
                    value: `${effectiveScore(scoreByAssessment.get(a.id)) ?? "—"} / ${a.maxScore}`,
                  });
                });
                if (s.hasMidterm) {
                  items.push({
                    label: "閱讀",
                    value: `${effectiveScore(midtermReadingBySession.get(s.id)) ?? "—"} / ${s.midtermMaxScore / 2}`,
                  });
                  items.push({
                    label: "聽力",
                    value: `${effectiveScore(midtermListeningBySession.get(s.id)) ?? "—"} / ${s.midtermMaxScore / 2}`,
                  });
                }
                if (s.hasFinal) {
                  items.push({
                    label: tSessions("final"),
                    value: `${effectiveScore(finalBySession.get(s.id)) ?? "—"} / ${s.finalMaxScore}`,
                  });
                }
              }
              const feedback = feedbackBySession.get(s.id);

              return (
                <div key={s.id} className={`${cardClass} space-y-2 p-3`}>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {s.label ?? dateFmt.format(s.date)}
                  </p>
                  {items.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {items.map((item) => (
                        <li key={item.label} className="flex items-center justify-between gap-3">
                          <span className="text-zinc-500 dark:text-zinc-500">{item.label}</span>
                          <span className="tabular font-medium text-zinc-900 dark:text-zinc-100">{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {feedback && (
                    <p className="border-t border-zinc-100 pt-2 text-sm text-zinc-600 dark:border-zinc-900 dark:text-zinc-400">
                      <span className="font-medium text-zinc-500 dark:text-zinc-500">{tSessions("feedback")}: </span>
                      {feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${cardClass} space-y-1 p-4`}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <MessageSquareText className="h-4 w-4 text-zinc-400" aria-hidden />
          {t("evaluation")}
        </h3>
        {/* Shown exactly as the teacher wrote it — never machine-translated. */}
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {enrollment.evaluation?.narrative || t("noEvaluationYet")}
        </p>
      </div>

      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <FeedbackForm enrollmentId={enrollment.id} existing={enrollment.feedback} />
      </div>
    </div>
  );
}
