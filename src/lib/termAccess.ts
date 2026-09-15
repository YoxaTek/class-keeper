import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { canWriteTerm } from "./permissions";

/**
 * Resolves the term for a term-scoped page/route and enforces that the
 * signed-in user is staff (teacher/TA) with access to it. Students never
 * reach these routes — they use /me instead.
 */
export async function requireTermAccess(termId: string) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "STUDENT") redirect("/me");

  const term = await prisma.term.findUnique({
    where: { id: termId },
    include: { subject: true },
  });
  if (!term) notFound();

  const allowed = await canWriteTerm(session.user.id, termId);
  if (!allowed) notFound();

  return { session, term };
}
