import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ termId: string; userId: string }> }
) {
  const { termId, userId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = await prisma.term.findUnique({ where: { id: termId }, select: { teacherId: true } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (term.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.termAssistant.delete({ where: { termId_userId: { termId, userId } } });
  return NextResponse.json({ ok: true });
}
