import { z } from "zod";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .nullable();

/** One weekly meeting: which weekday (0 = Sunday … 6 = Saturday) and its own start/end time — days can differ. */
export const scheduleSlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
});
export const scheduleSchema = z.array(scheduleSlotSchema).max(7);

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/** Reads Course.schedule (stored as JSON) defensively; anything malformed is "no schedule". */
export function parseSchedule(value: unknown): ScheduleSlot[] {
  const parsed = scheduleSchema.safeParse(value);
  return parsed.success ? sortSchedule(parsed.data) : [];
}

export function sortSchedule(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day));
}

/** The distinct meeting weekdays, which the class-date generator and counts work from. */
export function scheduleDays(slots: ScheduleSlot[]): number[] {
  return [...new Set(slots.map((s) => s.day))];
}

const timeRange = (slot: ScheduleSlot) =>
  slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : (slot.startTime ?? "");

/**
 * Display lines, one per distinct time: days sharing a time are grouped, e.g.
 * ["Mon, Wed 09:00 - 11:30", "Fri 14:00 - 16:00"].
 */
export function formatSchedule(slots: ScheduleSlot[], dayName: (day: number) => string): string[] {
  const groups = new Map<string, number[]>();
  for (const slot of sortSchedule(slots)) {
    const key = timeRange(slot);
    groups.set(key, [...(groups.get(key) ?? []), slot.day]);
  }
  return [...groups]
    .map(([range, days]) => [days.map(dayName).join(", "), range].filter(Boolean).join(" "));
}
