import { describe, expect, it } from "vitest";
import { canAddTA, canCreateTerm, PRO_TA_LIMIT } from "./planLimits";

describe("canCreateTerm", () => {
  it("FREE allows the first active term but not a second", () => {
    expect(canCreateTerm("FREE", 0)).toBe(true);
    expect(canCreateTerm("FREE", 1)).toBe(false);
  });

  it("PRO and INSTITUTION are unlimited", () => {
    expect(canCreateTerm("PRO", 999)).toBe(true);
    expect(canCreateTerm("INSTITUTION", 999)).toBe(true);
  });
});

describe("canAddTA", () => {
  it("FREE never allows a TA", () => {
    expect(canAddTA("FREE", 0)).toBe(false);
  });

  it("PRO allows up to PRO_TA_LIMIT distinct TAs", () => {
    expect(canAddTA("PRO", PRO_TA_LIMIT - 1)).toBe(true);
    expect(canAddTA("PRO", PRO_TA_LIMIT)).toBe(false);
  });

  it("INSTITUTION is unlimited", () => {
    expect(canAddTA("INSTITUTION", 999)).toBe(true);
  });
});
