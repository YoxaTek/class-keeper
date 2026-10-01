import { describe, expect, it } from "vitest";
import { countPlannedSessions, plannedSessionDates } from "./plannedSessions";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (dates: Date[]) => dates.map((x) => x.toISOString().slice(0, 10));

describe("plannedSessionDates", () => {
  it("picks the chosen weekdays in order, up to the count", () => {
    // 2026-09-22 is a Tuesday; Tue + Thu.
    expect(iso(plannedSessionDates(d("2026-09-22"), d("2026-12-15"), [2, 4], 4))).toEqual([
      "2026-09-22",
      "2026-09-24",
      "2026-09-29",
      "2026-10-01",
    ]);
  });

  it("stops early when the term ends before the count is reached", () => {
    expect(iso(plannedSessionDates(d("2026-09-22"), d("2026-09-30"), [2], 10))).toEqual(["2026-09-22", "2026-09-29"]);
  });

  it("defaults to the start date's weekday when none are chosen", () => {
    expect(iso(plannedSessionDates(d("2026-09-22"), d("2026-10-10"), [], 3))).toEqual([
      "2026-09-22",
      "2026-09-29",
      "2026-10-06",
    ]);
  });

  it("returns nothing for a zero count or inverted range", () => {
    expect(plannedSessionDates(d("2026-09-22"), d("2026-12-15"), [2], 0)).toEqual([]);
    expect(plannedSessionDates(d("2026-12-15"), d("2026-09-22"), [2], 5)).toEqual([]);
  });
});

describe("countPlannedSessions", () => {
  it("counts the matching weekdays in the range", () => {
    // Tue + Thu from 2026-09-22 to 2026-10-01: 22, 24, 29, 1 Oct.
    expect(countPlannedSessions("2026-09-22", "2026-10-01", [2, 4])).toBe(4);
  });

  it("is null until both dates are set", () => {
    expect(countPlannedSessions("", "2026-10-01", [2])).toBeNull();
    expect(countPlannedSessions("2026-09-22", "", [2])).toBeNull();
  });
});
