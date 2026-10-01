import { prisma } from "@/lib/prisma";

/**
 * For a callbackUrl that points at a class join (`/invites?course=<id>`):
 * the course's "Subject · Term · Institute" label, so the login/sign-up
 * screens can say which course the person is about to join. Null for any
 * other callbackUrl (or an unknown course).
 */
export async function joinCourseLabel(callbackUrl: string): Promise<string | null> {
  const courseId = new URL(callbackUrl, "http://x").searchParams.get("course");
  if (!courseId || !callbackUrl.startsWith("/invites")) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { name: true, institute: true, subject: { select: { name: true } } },
  });
  if (!course) return null;
  return [course.subject.name, course.name, course.institute].filter(Boolean).join(" · ");
}
