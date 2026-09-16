import { prisma } from "@/lib/prisma";

/** Subjects are just free-text labels now (no picker) — find an existing one by exact name or create it. */
export async function getOrCreateSubjectId(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await prisma.subject.findFirst({ where: { name: trimmed } });
  if (existing) return existing.id;
  const created = await prisma.subject.create({ data: { name: trimmed } });
  return created.id;
}
