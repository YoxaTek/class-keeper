// Subscription limits are temporarily disabled — every account gets
// unlimited terms/TAs regardless of plan. To re-enable, uncomment the
// bodies below (and the now-unused imports/helpers).
//
// import { prisma } from "@/lib/prisma";
// import { getEffectivePlanTier, type UserForSubscription } from "./effectiveSubscription";
// import { canAddTA, canCreateTerm, PLAN_LIMITS } from "./planLimits";
//
// async function loadUserForSubscription(userId: string): Promise<UserForSubscription> {
//   return prisma.user.findUniqueOrThrow({
//     where: { id: userId },
//     select: {
//       organizationId: true,
//       subscription: { select: { tier: true, status: true } },
//       organization: { select: { subscription: { select: { tier: true, status: true } } } },
//     },
//   });
// }
//
// /** A term is "active" for FREE-plan purposes if it hasn't ended yet. */
// async function countActiveTerms(teacherId: string): Promise<number> {
//   return prisma.term.count({ where: { teacherId, endDate: { gte: new Date() } } });
// }
//
// /**
//  * Distinct TAs across every term this account is responsible for: just the
//  * teacher's own terms for a solo/PRO account, or every term across every
//  * teacher in the organization for an org-covered one.
//  */
// async function countDistinctTAs(user: UserForSubscription, teacherId: string): Promise<number> {
//   const teacherIds = user.organizationId
//     ? (
//         await prisma.user.findMany({ where: { organizationId: user.organizationId }, select: { id: true } })
//       ).map((u) => u.id)
//     : [teacherId];
//
//   const rows = await prisma.termAssistant.findMany({
//     where: { term: { teacherId: { in: teacherIds } } },
//     select: { userId: true },
//     distinct: ["userId"],
//   });
//   return rows.length;
// }

export class PlanLimitError extends Error {}

/** Every gated action must call one of these — never check plan fields directly. */
export async function assertCanCreateTerm(_teacherId: string) {
  // const user = await loadUserForSubscription(teacherId);
  // const tier = getEffectivePlanTier(user);
  // const activeCount = await countActiveTerms(teacherId);
  //
  // if (!canCreateTerm(tier, activeCount)) {
  //   throw new PlanLimitError(
  //     `The ${tier} plan allows ${PLAN_LIMITS[tier].maxActiveTerms} active term(s). Upgrade to add more.`
  //   );
  // }
}

export async function assertCanAddTA(_teacherId: string) {
  // const user = await loadUserForSubscription(teacherId);
  // const tier = getEffectivePlanTier(user);
  //
  // if (PLAN_LIMITS[tier].maxTAs === null) return; // unlimited, skip the count query
  //
  // const distinctTAs = await countDistinctTAs(user, teacherId);
  // if (!canAddTA(tier, distinctTAs)) {
  //   throw new PlanLimitError(
  //     PLAN_LIMITS[tier].maxTAs === 0
  //       ? `The ${tier} plan does not include TAs. Upgrade to PRO or INSTITUTION.`
  //       : `The ${tier} plan allows up to ${PLAN_LIMITS[tier].maxTAs} TA(s). Upgrade for more.`
  //   );
  // }
}
