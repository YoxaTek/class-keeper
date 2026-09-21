import { prisma } from "@/lib/prisma";
import type { AssessmentType } from "@prisma/client";

/**
 * Replaces a session's quiz (or assignment) list with exactly the given
 * items — an id-less item is a new Assessment, one with an id is updated in
 * place, and any existing Assessment of this type not present in `items`
 * (a teacher removed it in the form) is deleted, cascading its scores.
 */
export async function syncAssessments(
  sessionId: string,
  type: AssessmentType,
  items: { id?: string; label?: string | null; maxScore: number }[]
) {
  const keepIds = items.filter((i) => i.id).map((i) => i.id!);
  await prisma.assessment.deleteMany({ where: { sessionId, type, id: { notIn: keepIds } } });
  await Promise.all(
    items.map((item, order) =>
      item.id
        ? prisma.assessment.update({ where: { id: item.id }, data: { label: item.label || null, maxScore: item.maxScore, order } })
        : prisma.assessment.create({ data: { sessionId, type, label: item.label || null, maxScore: item.maxScore, order } })
    )
  );
}
