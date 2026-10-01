import { CircleCheck, TriangleAlert } from "lucide-react";
import { cardClass } from "@/components/ui/styles";
import { DonutChart, GRADE_CATEGORY_COLORS } from "@/components/DonutChart";
import type { GradeBreakdown } from "@/lib/grading/calculateGrade";
import f from "@/components/ui/form.module.scss";
import s from "./GradeBreakdownCard.module.scss";

const CATEGORY_ORDER = ["attendance", "assignment", "quiz", "midterm", "final", "impression"] as const;

export function GradeBreakdownCard({
  grade,
  weights,
  labels,
  hasData,
}: {
  grade: GradeBreakdown;
  weights: {
    attendance: number;
    assignment: number;
    quiz: number;
    midterm: number;
    final: number;
    impression: number;
  };
  labels: {
    title: string;
    passing: string;
    belowPassing: string;
    attendance: string;
    assignment: string;
    quiz: string;
    midterm: string;
    final: string;
    impression: string;
  };
  /**
   * Whether each category has anything recorded at all — a course that
   * never added a midterm, or a student never given an impression score,
   * shows 0 the same way a *graded* zero would. Only a category that's
   * both zero AND empty gets dimmed, so a real bad score never quietly
   * fades into looking like "nothing to see here".
   */
  hasData: {
    attendance: boolean;
    assignment: boolean;
    quiz: boolean;
    midterm: boolean;
    final: boolean;
    impression: boolean;
  };
}) {
  const totalMax =
    weights.attendance + weights.assignment + weights.quiz + weights.midterm + weights.final + weights.impression;

  const segments = CATEGORY_ORDER.map((key) => ({
    label: labels[key],
    value: grade[key].score,
    color: GRADE_CATEGORY_COLORS[key],
  }));

  return (
    <section className={`${cardClass} ${s.card}`}>
      <div className={f.rowBetween}>
        <h3 className={s.title}>{labels.title}</h3>
        <span
          className={`${s.badge} ${grade.passing ? "" : s.below}`}
        >
          {grade.passing ? <CircleCheck size={12} /> : <TriangleAlert size={12} />}
          {grade.passing ? labels.passing : labels.belowPassing}
        </span>
      </div>

      <div className={s.body}>
        <DonutChart
          segments={segments}
          max={totalMax}
          centerLabel={`${grade.total.toFixed(1)}`}
          centerSubLabel={`/ ${totalMax}`}
        />
        <ul className={s.list}>
          {CATEGORY_ORDER.map((key) => {
            // Dimmed only when BOTH zero and empty — a genuine zero score
            // (data exists, it's just bad) stays at full brightness.
            const isEmpty = !hasData[key] && grade[key].score === 0;
            return (
              <li key={key} className={`${s.item} ${isEmpty ? s.empty : ""}`}>
                <span className={s.name}>
                  <span className={s.dot} style={{ background: GRADE_CATEGORY_COLORS[key] }} />
                  {labels[key]}
                </span>
                <span className={`tabular ${s.score}`}>
                  {grade[key].score.toFixed(1)}/{weights[key]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
