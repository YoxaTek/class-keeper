import { prisma } from "@/lib/prisma";

// A student is assumed absent unless a teacher marks otherwise — the
// attendance control already shows "Absent" for anyone without a row, so
// this makes that default a real row instead of a UI-only illusion that
// turnout/grade calculations silently skip.

// Called after creating or editing a class session: backfills ABSENT rows
// for every student already enrolled by that session's date.
export async function ensureAttendanceForSession(sessionId: string) {
  const classSession = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  if (!classSession.hasAttendance) return;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: classSession.courseId, joinedAt: { lte: classSession.date } },
    select: { id: true },
  });
  if (enrollments.length === 0) return;

  await prisma.attendance.createMany({
    data: enrollments.map((e) => ({ sessionId, enrollmentId: e.id, status: "ABSENT" as const })),
    skipDuplicates: true,
  });
}

// Called after enrolling a student: backfills ABSENT rows for every
// attendance-taking session on or after the day they joined.
export async function ensureAttendanceForEnrollment(enrollmentId: string, courseId: string, joinedAt: Date) {
  const sessions = await prisma.session.findMany({
    where: { courseId, hasAttendance: true, date: { gte: joinedAt } },
    select: { id: true },
  });
  if (sessions.length === 0) return;

  await prisma.attendance.createMany({
    data: sessions.map((s) => ({ sessionId: s.id, enrollmentId, status: "ABSENT" as const })),
    skipDuplicates: true,
  });
}
