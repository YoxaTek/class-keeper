import { describe, expect, it } from "vitest";
import { canAddTA, canCreateCourse, PRO_TA_LIMIT } from "./planLimits";

describe("canCreateCourse", () => {
  it("FREE allows the first active course but not a second", () => {
    expect(canCreateCourse("FREE", 0)).toBe(true);
    expect(canCreateCourse("FREE", 1)).toBe(false);
  });

  it("PRO and INSTITUTION are unlimited", () => {
    expect(canCreateCourse("PRO", 999)).toBe(true);
    expect(canCreateCourse("INSTITUTION", 999)).toBe(true);
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
