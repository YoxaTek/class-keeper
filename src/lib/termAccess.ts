import { notFound, redirect } from "next/navigation";
import { prisma } from "./prisma";
import { canWriteTerm } from "./permissions";
import { getCurrentUser } from "./currentUser";

/**
 * Resolves the term for a term-scoped page/route and enforces that the
 * signed-in user is staff (teacher/TA) with access to it. Students never
 * reach these routes — they use /me instead. The role redirect below is
 * just a fast, friendly UX path; canWriteTerm's DB-fresh ownership check is
 * the actual security boundary, so a stale session role here can't leak
 * access — it would just fall through to notFound() instead.
 */
export async function requireTermAccess(termId: string) {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") redirect("/me");

  const term = await prisma.term.findUnique({
    where: { id: termId },
    include: { subject: true },
  });
  if (!term) notFound();

  const allowed = await canWriteTerm(user.id, termId);
  if (!allowed) notFound();

  return { user, term };
}
