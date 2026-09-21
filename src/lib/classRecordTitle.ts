/**
 * Which calendar week (1-based, counting 7-day blocks from the course's
 * start date) a session falls in — NOT the session's ordinal position among
 * the course's classes. A twice-weekly course has two classes landing in
 * the same week number; counting by position would wrongly call the second
 * one "week 2".
 */
export function courseWeekNumber(courseStartDate: Date, sessionDate: Date): number {
  const start = Date.UTC(courseStartDate.getFullYear(), courseStartDate.getMonth(), courseStartDate.getDate());
  const date = Date.UTC(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  const diffDays = Math.round((date - start) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// The PDF export's single title line, e.g. "114-2 生活華語進階班學生紀錄簿（Week12-115.05.26）".
// Matches the paper attendance sheet format this replaces: course name +
// subject, the fixed "學生紀錄簿" label, then the week number (see
// courseWeekNumber) and the date in the ROC/Minguo calendar (year - 1911).
export function buildClassRecordTitle({
  courseName,
  subjectName,
  weekNumber,
  date,
}: {
  courseName: string;
  subjectName: string;
  weekNumber: number;
  date: Date;
}): string {
  const rocYear = date.getFullYear() - 1911;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${courseName} ${subjectName}學生紀錄簿（Week${weekNumber}-${rocYear}.${month}.${day}）`;
}
