import { prisma } from "@/lib/prisma";

// A student is assumed present unless a teacher marks otherwise — the
// attendance dropdown already shows "Present" for anyone without a row, so
// this makes that default a real row instead of a UI-only illusion that
// turnout/grade calculations silently skip.

// Called after creating or editing a class session: backfills PRESENT rows
// for every student already enrolled by that session's date.
export async function ensureAttendanceForSession(sessionId: string) {
  const classSession = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  if (!classSession.hasAttendance) return;

  const enrollments = await prisma.enrollment.findMany({
    where: { termId: classSession.termId, joinedAt: { lte: classSession.date } },
    select: { id: true },
  });
  if (enrollments.length === 0) return;

  await prisma.attendance.createMany({
    data: enrollments.map((e) => ({ sessionId, enrollmentId: e.id, status: "PRESENT" as const })),
    skipDuplicates: true,
  });
}

// Called after enrolling a student: backfills PRESENT rows for every
// attendance-taking session on or after the day they joined.
export async function ensureAttendanceForEnrollment(enrollmentId: string, termId: string, joinedAt: Date) {
  const sessions = await prisma.session.findMany({
    where: { termId, hasAttendance: true, date: { gte: joinedAt } },
    select: { id: true },
  });
  if (sessions.length === 0) return;

  await prisma.attendance.createMany({
    data: sessions.map((s) => ({ sessionId: s.id, enrollmentId, status: "PRESENT" as const })),
    skipDuplicates: true,
  });
}
