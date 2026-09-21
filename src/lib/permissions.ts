import { prisma } from "./prisma";

/**
 * A user may write to a course iff they are its teacher, or they have an
 * explicit CourseAssistant row for it. Never trust a client-supplied role
 * claim — always resolve this from the DB for the course being touched.
 *
 * `knownTeacherId` lets a caller that already fetched the course (e.g.
 * requireCourseAccess, which runs on every course-scoped page) skip
 * re-querying it here just to read teacherId again.
 */
export async function canWriteCourse(userId: string, courseId: string, knownTeacherId?: string): Promise<boolean> {
  const teacherId =
    knownTeacherId ?? (await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } }))?.teacherId;
  if (!teacherId) return false;
  if (teacherId === userId) return true;

  const assistant = await prisma.courseAssistant.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  return assistant !== null;
}

export async function requireCourseWriteAccess(userId: string, courseId: string) {
  const allowed = await canWriteCourse(userId, courseId);
  if (!allowed) {
    throw new ForbiddenError(`User ${userId} cannot write to course ${courseId}`);
  }
}

export class ForbiddenError extends Error {}
