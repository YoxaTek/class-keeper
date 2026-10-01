const DAY_MS = 86_400_000;
export const MAX_PLANNED_SESSIONS = 200;

/**
 * The class dates a new course starts with: walking forward from `start`
 * (inclusive) to `end` (inclusive), every day whose weekday is in `weekdays`
 * (0 = Sunday … 6 = Saturday, UTC — dates are stored as UTC midnight), until
 * `count` dates are collected. An empty `weekdays` means "weekly on the
 * start date's weekday". Stops early when the term runs out of days.
 */
export function plannedSessionDates(start: Date, end: Date, weekdays: number[], count: number): Date[] {
  if (count <= 0 || end < start) return [];
  const days = weekdays.length > 0 ? new Set(weekdays) : new Set([start.getUTCDay()]);

  const dates: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime() && dates.length < count; t += DAY_MS) {
    const day = new Date(t);
    if (days.has(day.getUTCDay())) dates.push(day);
  }
  return dates;
}

/** How many classes the schedule yields between two form dates ("YYYY-MM-DD") — null until both are set. */
export function countPlannedSessions(startDate: string, endDate: string, weekdays: number[]): number | null {
  if (!startDate || !endDate) return null;
  return plannedSessionDates(new Date(startDate), new Date(endDate), weekdays, MAX_PLANNED_SESSIONS).length;
}
