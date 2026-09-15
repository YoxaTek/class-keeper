import { prisma } from "./prisma";

/**
 * A user may write to a term iff they are its teacher, or they have an
 * explicit TermAssistant row for it. Never trust a client-supplied role
 * claim — always resolve this from the DB for the term being touched.
 */
export async function canWriteTerm(userId: string, termId: string): Promise<boolean> {
  const term = await prisma.term.findUnique({
    where: { id: termId },
    select: { teacherId: true },
  });
  if (!term) return false;
  if (term.teacherId === userId) return true;

  const assistant = await prisma.termAssistant.findUnique({
    where: { termId_userId: { termId, userId } },
  });
  return assistant !== null;
}

export async function requireTermWriteAccess(userId: string, termId: string) {
  const allowed = await canWriteTerm(userId, termId);
  if (!allowed) {
    throw new ForbiddenError(`User ${userId} cannot write to term ${termId}`);
  }
}

export class ForbiddenError extends Error {}
