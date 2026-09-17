import type { PlanTier, SubscriptionStatus } from "@prisma/client";

export interface SubscriptionLike {
  tier: PlanTier;
  status: SubscriptionStatus;
}

export interface UserForSubscription<T extends SubscriptionLike = SubscriptionLike> {
  organizationId: string | null;
  subscription: T | null;
  organization: { subscription: T | null } | null;
}

/**
 * The single source of truth for "what plan does this user have."
 * Every gated action must go through this (or getEffectivePlanTier below)
 * instead of reading user.subscription / user.organization directly, so
 * solo teachers and org-covered teachers are gated identically.
 *
 * A user can belong to an Organization purely as an "institution" profile
 * detail (see /onboarding) with no org-level billing at all — that must
 * never silently erase a personal subscription they already have, so the
 * org's plan only takes priority when the org actually has one; otherwise
 * this falls back to the user's own subscription.
 *
 * Generic over T so callers that loaded the full Subscription row (e.g. to
 * read paypalSubscriptionId for the billing page) get it back typed in full,
 * while gating code that only needs {tier, status} can use the plain shape.
 */
export function getEffectiveSubscription<T extends SubscriptionLike>(user: UserForSubscription<T>): T | null {
  if (user.organizationId && user.organization?.subscription) return user.organization.subscription;
  return user.subscription;
}

/**
 * Resolves a user straight to a plan tier, defaulting to FREE when there's
 * no subscription at all. A CANCELED subscription also falls back to FREE —
 * PAST_DUE and TRIALING still count as their paid tier (the provider's own
 * grace period already governs whether PAST_DUE eventually becomes
 * CANCELED, so we don't need a second cutoff here).
 */
export function getEffectivePlanTier(user: UserForSubscription): PlanTier {
  const subscription = getEffectiveSubscription(user);
  if (!subscription) return "FREE";
  if (subscription.status === "CANCELED") return "FREE";
  return subscription.tier;
}
