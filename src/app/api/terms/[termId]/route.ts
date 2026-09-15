import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Only the owning teacher can delete a term — not a TA, even one with
// write access to it. Cascades (via schema onDelete: Cascade) take
// enrollments, sessions, attendance, scores, evaluations, feedback,
// TA assignments, and pending invites for this term with it. The
// underlying Student and Subject rows are untouched.
export async function DELETE(_request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = await prisma.term.findUnique({ where: { id: termId }, select: { teacherId: true } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (term.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.term.delete({ where: { id: termId } });
  return NextResponse.json({ ok: true });
}
