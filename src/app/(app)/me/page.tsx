import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { calculateGrade } from "@/lib/grading/calculateGrade";
import { cardClass } from "@/components/ui/styles";
import { GradeBreakdownCard } from "@/components/GradeBreakdownCard";
import { FeedbackForm } from "./FeedbackForm";

function effectiveScore(record: { originalScore: number | null; retakeScore: number | null } | undefined) {
  if (!record) return null;
  return record.retakeScore ?? record.originalScore;
}

export default async function MePage() {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") redirect("/");

  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");
  const tGrade = await getTranslations("studentDetail");
  const tSessions = await getTranslations("sessions");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      enrollments: {
        include: {
          term: { include: { subject: true, sessions: true } },
          attendance: true,
          scores: true,
          evaluation: true,
          feedback: true,
          sessionFeedback: true,
        },
        orderBy: { term: { startDate: "desc" } },
      },
    },
  });

  if (!student) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No student profile is linked to this account.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {student.enrollments.map((enrollment) => {
        const { term } = enrollment;
        const grade = calculateGrade({
          attendance: enrollment.attendance.map((a) => ({ status: a.status })),
          sessions: term.sessions.map((s) => ({
            id: s.id,
            hasQuiz: s.hasQuiz,
            quizMaxScore: s.quizMaxScore,
            hasAssignment: s.hasAssignment,
            assignmentMaxScore: s.assignmentMaxScore,
            hasMidterm: s.hasMidterm,
            midtermMaxScore: s.midtermMaxScore,
            hasFinal: s.hasFinal,
            finalMaxScore: s.finalMaxScore,
          })),
          scores: enrollment.scores.map((s) => ({
            sessionId: s.sessionId,
            category: s.category,
            originalScore: s.originalScore,
            retakeScore: s.retakeScore,
            retakeMaxScore: s.retakeMaxScore,
          })),
          impressionScore: enrollment.evaluation?.impressionScore ?? null,
          settings: {
            maxExcusedAbsences: term.maxExcusedAbsences,
            weightAttendance: term.weightAttendance,
            weightAssignment: term.weightAssignment,
            weightQuiz: term.weightQuiz,
            weightMidterm: term.weightMidterm,
            weightFinal: term.weightFinal,
            weightImpression: term.weightImpression,
            passingScore: term.passingScore,
            finalExamSessionId: term.finalExamSessionId,
          },
        });

        // Only sessions the student was actually PRESENT for, and only
        // those with a quiz, assignment, midterm, or final component.
        const attendanceBySession = new Map(enrollment.attendance.map((a) => [a.sessionId, a.status]));
        const byCategoryAndSession = (category: string) =>
          new Map(enrollment.scores.filter((s) => s.category === category).map((s) => [s.sessionId, s]));
        const quizBySession = byCategoryAndSession("QUIZ");
        const assignmentBySession = byCategoryAndSession("ASSIGNMENT");
        const midtermReadingBySession = byCategoryAndSession("MIDTERM_READING");
        const midtermListeningBySession = byCategoryAndSession("MIDTERM_LISTENING");
        const finalBySession = byCategoryAndSession("FINAL");
        const feedbackBySession = new Map(enrollment.sessionFeedback.map((f) => [f.sessionId, f.note]));
        // A session earns a card if it has scores from a class the student
        // was PRESENT for, OR a TA/teacher left it session feedback — that
        // can happen for any session, present or not (e.g. a note about an
        // absence), so it isn't gated on attendance the way scores are.
        const cardSessions = term.sessions
          .filter(
            (s) =>
              ((s.hasQuiz || s.hasAssignment || s.hasMidterm || s.hasFinal) &&
                attendanceBySession.get(s.id) === "PRESENT") ||
              feedbackBySession.has(s.id)
          )
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        return (
          <section key={enrollment.id} className="space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {term.subject.name} <span className="text-zinc-400 dark:text-zinc-600">·</span> {term.name}
            </h2>

            <GradeBreakdownCard
              grade={grade}
              weights={{
                attendance: term.weightAttendance,
                assignment: term.weightAssignment,
                quiz: term.weightQuiz,
                midterm: term.weightMidterm,
                final: term.weightFinal,
                impression: term.weightImpression,
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
                    // Only the categories this particular session actually
                    // has — no placeholder dashes for ones it doesn't. Scores
                    // only show for a session the student was PRESENT for;
                    // feedback can appear either way (see cardSessions above).
                    const items: { label: string; value: string }[] = [];
                    if (attendanceBySession.get(s.id) === "PRESENT") {
                      if (s.hasQuiz) {
                        items.push({
                          label: tSessions("quiz"),
                          value: `${effectiveScore(quizBySession.get(s.id)) ?? "—"} / ${s.quizMaxScore}`,
                        });
                      }
                      if (s.hasAssignment) {
                        items.push({
                          label: tSessions("assignment"),
                          value: `${effectiveScore(assignmentBySession.get(s.id)) ?? "—"} / ${s.assignmentMaxScore}`,
                        });
                      }
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
          </section>
        );
      })}
    </div>
  );
}
