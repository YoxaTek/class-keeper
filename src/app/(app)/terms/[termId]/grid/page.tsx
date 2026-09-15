import { requireTermAccess } from "@/lib/termAccess";
import { prisma } from "@/lib/prisma";
import { SessionGrid } from "./SessionGrid";

export default async function GridPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  await requireTermAccess(termId);

  const [enrollments, sessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { termId },
      include: { student: true, attendance: true, scores: true },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.session.findMany({ where: { termId }, orderBy: { date: "asc" } }),
  ]);

  return <SessionGrid enrollments={enrollments} sessions={sessions} />;
}
