import type { PlanTier } from "@prisma/client";

/** Max distinct TAs a PRO teacher can have assigned across all their courses. Adjust freely. */
export const PRO_TA_LIMIT = 5;

export interface PlanLimits {
  /** null = unlimited */
  maxActiveCourses: number | null;
  /**
   * Max distinct TAs for the account: a solo teacher's own courses, or (for
   * INSTITUTION) pooled across every teacher in the organization. null =
   * unlimited.
   */
  maxTAs: number | null;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { maxActiveCourses: 1, maxTAs: 0 },
  PRO: { maxActiveCourses: null, maxTAs: PRO_TA_LIMIT },
  INSTITUTION: { maxActiveCourses: null, maxTAs: null },
};

export function canCreateCourse(tier: PlanTier, currentActiveCourseCount: number): boolean {
  const { maxActiveCourses } = PLAN_LIMITS[tier];
  return maxActiveCourses === null || currentActiveCourseCount < maxActiveCourses;
}

export function canAddTA(tier: PlanTier, currentDistinctTACount: number): boolean {
  const { maxTAs } = PLAN_LIMITS[tier];
  return maxTAs === null || currentDistinctTACount < maxTAs;
}
