import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "./prisma";
import { canWriteCourse } from "./permissions";
import { getCurrentUser } from "./currentUser";

/**
 * Resolves the course for a course-scoped page/route and enforces that the
 * signed-in user is staff (teacher/TA) with access to it. Students never
 * reach these routes — they use /me instead. The role redirect below is
 * just a fast, friendly UX path; canWriteCourse's DB-fresh ownership check is
 * the actual security boundary, so a stale session role here can't leak
 * access — it would just fall through to notFound() instead.
 *
 * Wrapped in cache() because both courses/[courseId]/layout.tsx (the access
 * gate) and the page it renders call this independently — without caching,
 * every course-scoped navigation ran the course fetch and permission check
 * twice per request.
 */
export const requireCourseAccess = cache(async (courseId: string) => {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") redirect("/me");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { subject: true },
  });
  if (!course) notFound();

  const allowed = await canWriteCourse(user.id, courseId, course.teacherId);
  if (!allowed) notFound();

  return { user, course };
});
