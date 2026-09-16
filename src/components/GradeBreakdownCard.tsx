import { CircleCheck, TriangleAlert } from "lucide-react";
import { cardClass } from "@/components/ui/styles";
import { DonutChart, GRADE_CATEGORY_COLORS } from "@/components/DonutChart";
import type { GradeBreakdown } from "@/lib/grading/calculateGrade";

const CATEGORY_ORDER = ["attendance", "assignment", "quiz", "midterm", "final", "impression"] as const;

export function GradeBreakdownCard({
  grade,
  weights,
  labels,
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
}) {
  const totalMax =
    weights.attendance + weights.assignment + weights.quiz + weights.midterm + weights.final + weights.impression;

  const segments = CATEGORY_ORDER.map((key) => ({
    label: labels[key],
    value: grade[key].score,
    colorLight: GRADE_CATEGORY_COLORS[key].light,
    colorDark: GRADE_CATEGORY_COLORS[key].dark,
  }));

  return (
    <section className={`${cardClass} space-y-4 p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{labels.title}</h3>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            grade.passing
              ? "bg-[#0f6e56]/10 text-[#0f6e56] dark:text-teal-400"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {grade.passing ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
          {grade.passing ? labels.passing : labels.belowPassing}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <DonutChart
          segments={segments}
          max={totalMax}
          centerLabel={`${grade.total.toFixed(1)}`}
          centerSubLabel={`/ ${totalMax}`}
        />
        <ul className="flex-1 min-w-[180px] space-y-1.5 text-sm">
          {CATEGORY_ORDER.map((key) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full [background:var(--dot-light)] dark:[background:var(--dot-dark)]"
                  style={
                    {
                      "--dot-light": GRADE_CATEGORY_COLORS[key].light,
                      "--dot-dark": GRADE_CATEGORY_COLORS[key].dark,
                    } as React.CSSProperties
                  }
                />
                {labels[key]}
              </span>
              <span className="tabular font-medium text-zinc-900 dark:text-zinc-100">
                {grade[key].score.toFixed(1)}/{weights[key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
