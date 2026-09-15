import { describe, expect, it } from "vitest";
import { getEffectiveSubscription, getEffectivePlanTier, type UserForSubscription } from "./effectiveSubscription";

function user(overrides: Partial<UserForSubscription> = {}): UserForSubscription {
  return {
    organizationId: null,
    subscription: null,
    organization: null,
    ...overrides,
  };
}

describe("getEffectiveSubscription", () => {
  it("returns the user's own subscription when they have no organization", () => {
    const sub = { tier: "PRO" as const, status: "ACTIVE" as const };
    expect(getEffectiveSubscription(user({ subscription: sub }))).toBe(sub);
  });

  it("returns the organization's subscription when the user belongs to one, ignoring any personal subscription", () => {
    const orgSub = { tier: "INSTITUTION" as const, status: "ACTIVE" as const };
    const personalSub = { tier: "PRO" as const, status: "ACTIVE" as const };
    const result = getEffectiveSubscription(
      user({ organizationId: "org1", organization: { subscription: orgSub }, subscription: personalSub })
    );
    expect(result).toBe(orgSub);
  });

  it("returns null when the user belongs to an organization that has no subscription yet", () => {
    const result = getEffectiveSubscription(user({ organizationId: "org1", organization: { subscription: null } }));
    expect(result).toBeNull();
  });

  it("returns null for a solo user with no subscription", () => {
    expect(getEffectiveSubscription(user())).toBeNull();
  });
});

describe("getEffectivePlanTier", () => {
  it("defaults to FREE when there is no subscription", () => {
    expect(getEffectivePlanTier(user())).toBe("FREE");
  });

  it("falls back to FREE when the subscription is CANCELED", () => {
    expect(getEffectivePlanTier(user({ subscription: { tier: "PRO", status: "CANCELED" } }))).toBe("FREE");
  });

  it("honors PAST_DUE as still on its paid tier", () => {
    expect(getEffectivePlanTier(user({ subscription: { tier: "PRO", status: "PAST_DUE" } }))).toBe("PRO");
  });

  it("honors TRIALING as its paid tier", () => {
    expect(getEffectivePlanTier(user({ subscription: { tier: "INSTITUTION", status: "TRIALING" } }))).toBe(
      "INSTITUTION"
    );
  });

  it("resolves through the organization for an org-covered teacher", () => {
    const result = getEffectivePlanTier(
      user({
        organizationId: "org1",
        organization: { subscription: { tier: "INSTITUTION", status: "ACTIVE" } },
      })
    );
    expect(result).toBe("INSTITUTION");
  });
});
