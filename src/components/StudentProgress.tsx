import { getTranslations } from "next-intl/server";
import { CircleCheck } from "lucide-react";
import { attendanceIcon, attendanceColor } from "@/lib/attendanceIcons";
import { assessmentDisplayLabel } from "@/lib/assessmentLabel";
import type { StudentProgress as Progress } from "@/lib/studentProgress";
import { cardClass } from "@/components/ui/styles";
import { GradeBreakdownCard } from "@/components/GradeBreakdownCard";
import { EvaluationForm } from "@/components/EvaluationForm";
import s from "./StudentProgress.module.scss";

function scoreValue(record: { originalScore: number | null; retakeScore: number | null } | undefined) {
  if (!record) return null;
  return record.retakeScore ?? record.originalScore;
}

/**
 * The one "student record" screen — grade breakdown, evaluation, every
 * score, attendance history and class notes. Teachers/TAs and the student
 * themself see exactly this; the only difference is `editable`: staff get
 * the evaluation form, the student gets the teacher's evaluation read-only.
 */
export async function StudentProgress({ progress, editable }: { progress: Progress; editable: boolean }) {
  const { enrollment, course, sessions, assessments, grade, hasData } = progress;
  const t = await getTranslations("studentDetail");
  const tView = await getTranslations("studentView");
  const tStatus = await getTranslations("attendanceStatus");
  const tDashboard = await getTranslations("dashboard");
  const tSessions = await getTranslations("sessions");
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  const sessionById = new Map(sessions.map((x) => [x.id, x]));
  const scoreByAssessmentId = new Map(
    enrollment.scores
      .filter((x): x is typeof x & { assessmentId: string } => !!x.assessmentId)
      .map((x) => [x.assessmentId, x])
  );

  // A teacher-set label always wins; otherwise "Quiz · <class name>" beats a
  // bare sequence number since it says which class the quiz was from.
  function assessmentRows(type: "QUIZ" | "ASSIGNMENT") {
    const baseLabel = type === "QUIZ" ? tSessions("quiz") : tSessions("assignment");
    const ofType = assessments.filter((a) => a.type === type);
    return ofType.map((a, i) => {
      const session = sessionById.get(a.sessionId);
      const record = scoreByAssessmentId.get(a.id);
      return {
        id: a.id,
        label: a.label || (session?.label ? `${baseLabel} · ${session.label}` : assessmentDisplayLabel(baseLabel, a, i, ofType.length)),
        date: session ? dateFmt.format(session.date) : "",
        value: scoreValue(record),
        original: record?.originalScore ?? null,
        hasRetake: record?.retakeScore != null,
        max: a.maxScore,
      };
    });
  }
  const quizRows = assessmentRows("QUIZ");
  const assignmentRows = assessmentRows("ASSIGNMENT");

  const midtermSession = sessions.find((x) => x.hasMidterm);
  const finalSession = sessions.find((x) => x.hasFinal);
  const readingRecord = enrollment.scores.find((x) => x.category === "MIDTERM_READING");
  const listeningRecord = enrollment.scores.find((x) => x.category === "MIDTERM_LISTENING");
  const finalRecord = enrollment.scores.find((x) => x.category === "FINAL");
  const hasMidtermOrFinal = !!midtermSession || !!finalSession;

  return (
    <div className={s.page}>
      <h2 className={s.name}>
        {enrollment.student.name}
        {enrollment.student.chineseName && <span className={s.chinese}>{enrollment.student.chineseName}</span>}
      </h2>

      <div className={s.two}>
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
            title: t("grade"),
            passing: t("passing"),
            belowPassing: t("belowPassing"),
            attendance: tDashboard("weightAttendance"),
            assignment: tDashboard("weightAssignment"),
            quiz: tDashboard("weightQuiz"),
            midterm: tDashboard("weightMidterm"),
            final: tDashboard("weightFinal"),
            impression: tDashboard("weightImpression"),
          }}
          hasData={hasData}
        />

        <section className={`${cardClass} ${s.evaluation}`}>
          <h3 className={s.cardTitle}>{t("evaluation")}</h3>
          {editable ? (
            <EvaluationForm
              courseId={course.id}
              enrollmentId={enrollment.id}
              initialNarrative={enrollment.evaluation?.narrative ?? ""}
              initialImpressionScore={enrollment.evaluation?.impressionScore ?? null}
              maxImpressionScore={course.weightImpression}
            />
          ) : (
            // Shown exactly as the teacher wrote it — never machine-translated.
            <p className={s.narrative}>{enrollment.evaluation?.narrative || tView("noEvaluationYet")}</p>
          )}
        </section>
      </div>

      {/* Final → midterm → assignments → quizzes → attendance history:
          heaviest/least-frequent items first, working down to the thing
          recorded every single class. */}
      <div className={s.two}>
        {finalSession && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{tSessions("final")}</h3>
            <div className={s.rows}>
              <ScoreRow
                label={dateFmt.format(finalSession.date)}
                value={scoreValue(finalRecord)}
                max={finalSession.finalMaxScore ?? 100}
              />
            </div>
          </section>
        )}

        {midtermSession && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{tSessions("midterm")}</h3>
            <div className={s.rows}>
              <ScoreRow
                label="閱讀"
                date={dateFmt.format(midtermSession.date)}
                value={scoreValue(readingRecord)}
                max={(midtermSession.midtermMaxScore ?? 100) / 2}
              />
              <ScoreRow
                label="聽力"
                date={dateFmt.format(midtermSession.date)}
                value={scoreValue(listeningRecord)}
                max={(midtermSession.midtermMaxScore ?? 100) / 2}
              />
            </div>
          </section>
        )}

        {assignmentRows.length > 0 && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{tSessions("assignments")}</h3>
            <div className={s.rows}>
              {assignmentRows.map((row) => (
                <ScoreRow key={row.id} {...row} />
              ))}
            </div>
          </section>
        )}

        {quizRows.length > 0 && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{tSessions("quizzes")}</h3>
            <div className={s.rows}>
              {quizRows.map((row) => (
                <ScoreRow key={row.id} {...row} />
              ))}
            </div>
          </section>
        )}

        {!hasMidtermOrFinal && assignmentRows.length === 0 && quizRows.length === 0 && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{t("scoreHistory")}</h3>
            <div className={s.noScores}>
              <div className={s.noScoresIcon}>
                <CircleCheck size={16} aria-hidden />
              </div>
              <div className={s.noScoresTitle}>{t("noScoresYet")}</div>
              <div className={s.noScoresHint}>{t("noScoresYetHint")}</div>
            </div>
          </section>
        )}

        <section className={`${cardClass} ${s.card}`}>
          <h3 className={s.cardTitle}>{t("attendanceHistory")}</h3>
          {enrollment.attendance.length > 0 ? (
            <div className={s.rows}>
              {enrollment.attendance.map((a) => {
                const Icon = attendanceIcon[a.status];
                return (
                  <div key={a.id} className={s.row}>
                    <div>
                      <div className={`tabular ${s.attendanceDate}`}>{dateFmt.format(a.session.date)}</div>
                      {a.note && <div className={s.rowDate}>{a.note}</div>}
                    </div>
                    <span className={`${s.status} ${attendanceColor[a.status]}`}>
                      <Icon size={14} aria-hidden />
                      {tStatus(a.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={s.none}>—</div>
          )}
        </section>

        {enrollment.sessionFeedback.length > 0 && (
          <section className={`${cardClass} ${s.card}`}>
            <h3 className={s.cardTitle}>{tSessions("feedback")}</h3>
            <div className={s.rows}>
              {enrollment.sessionFeedback.map((n) => (
                <div key={n.id} className={s.row}>
                  <div>
                    <div className={`tabular ${s.attendanceDate}`}>{dateFmt.format(n.session.date)}</div>
                    <div className={s.rowLabel}>{n.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Shared by the midterm/final, assignment, and quiz cards — each is just a
// label (plus which class it was from) on the left and a score on the right.
function ScoreRow({
  label,
  date,
  value,
  max,
  original,
  hasRetake,
}: {
  label: string;
  date?: string;
  value: number | null;
  max: number;
  original?: number | null;
  hasRetake?: boolean;
}) {
  return (
    <div className={s.row}>
      <div>
        <div className={s.rowLabel}>{label}</div>
        {date && <div className={s.rowDate}>{date}</div>}
      </div>
      <span className={`tabular ${s.score}`}>
        {value ?? "—"}/{max}
        {hasRetake && original != null && <span className={s.original}>({original})</span>}
      </span>
    </div>
  );
}
