/**
 * A session can now have more than one quiz/assignment (see the Assessment
 * model) — this picks what to call each one. A teacher-set label always
 * wins; otherwise it's just the category name ("Quiz") when there's only
 * one, or numbered ("Quiz 1", "Quiz 2", ...) once there's more than one.
 */
export function assessmentDisplayLabel(
  baseLabel: string,
  assessment: { label: string | null },
  index: number,
  countOfSameType: number
): string {
  if (assessment.label) return assessment.label;
  return countOfSameType > 1 ? `${baseLabel} ${index + 1}` : baseLabel;
}
