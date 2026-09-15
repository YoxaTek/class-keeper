import type { PlanTier } from "@prisma/client";

/** Max distinct TAs a PRO teacher can have assigned across all their terms. Adjust freely. */
export const PRO_TA_LIMIT = 5;

export interface PlanLimits {
  /** null = unlimited */
  maxActiveTerms: number | null;
  /**
   * Max distinct TAs for the account: a solo teacher's own terms, or (for
   * INSTITUTION) pooled across every teacher in the organization. null =
   * unlimited.
   */
  maxTAs: number | null;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { maxActiveTerms: 1, maxTAs: 0 },
  PRO: { maxActiveTerms: null, maxTAs: PRO_TA_LIMIT },
  INSTITUTION: { maxActiveTerms: null, maxTAs: null },
};

export function canCreateTerm(tier: PlanTier, currentActiveTermCount: number): boolean {
  const { maxActiveTerms } = PLAN_LIMITS[tier];
  return maxActiveTerms === null || currentActiveTermCount < maxActiveTerms;
}

export function canAddTA(tier: PlanTier, currentDistinctTACount: number): boolean {
  const { maxTAs } = PLAN_LIMITS[tier];
  return maxTAs === null || currentDistinctTACount < maxTAs;
}
