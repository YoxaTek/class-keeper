import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; userId: string }> }
) {
  const { courseId, userId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.courseAssistant.delete({ where: { courseId_userId: { courseId, userId } } });
  return NextResponse.json({ ok: true });
}
