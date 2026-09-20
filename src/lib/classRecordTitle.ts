// The PDF export's single title line, e.g. "114-2 生活華語進階班學生紀錄簿（Week12-115.05.26）".
// Matches the paper attendance sheet format this replaces: course name +
// subject, the fixed "學生紀錄簿" label, then the week number (this
// session's 1-based position among the course's own sessions, ordered by
// date) and the date in the ROC/Minguo calendar (year - 1911).
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
