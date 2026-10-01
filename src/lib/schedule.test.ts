import { describe, expect, it } from "vitest";
import { formatSchedule, parseSchedule, scheduleDays } from "./schedule";

const name = (d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];

describe("schedule", () => {
  it("groups days that share a time and keeps different times separate", () => {
    const slots = [
      { day: 5, startTime: "14:00", endTime: "16:00" },
      { day: 1, startTime: "09:00", endTime: "11:30" },
      { day: 3, startTime: "09:00", endTime: "11:30" },
    ];
    expect(formatSchedule(slots, name)).toEqual(["Mon, Wed 09:00 - 11:30", "Fri 14:00 - 16:00"]);
  });

  it("shows just the days when no time is set", () => {
    expect(formatSchedule([{ day: 2, startTime: null, endTime: null }], name)).toEqual(["Tue"]);
  });

  it("treats malformed stored data as no schedule", () => {
    expect(parseSchedule("nope")).toEqual([]);
    expect(parseSchedule([{ day: 9 }])).toEqual([]);
  });

  it("lists each weekday once", () => {
    expect(scheduleDays([{ day: 2, startTime: null, endTime: null }, { day: 2, startTime: null, endTime: null }])).toEqual([2]);
  });
});
