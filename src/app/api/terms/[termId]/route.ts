import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateSubjectId } from "@/lib/getOrCreateSubject";
import { termInputSchema, validateTermDateRange } from "@/lib/validation/term";

// Only the owning teacher can edit a term's settings — mirrors the DELETE
// rule below, and creation (only a TEACHER can POST /api/terms).
export async function PATCH(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = await prisma.term.findUnique({ where: { id: termId }, select: { teacherId: true } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (term.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = termInputSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const data = body.data;

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const dateError = validateTermDateRange(startDate, endDate);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  const subjectId = await getOrCreateSubjectId(data.subjectName);

  const updated = await prisma.term.update({
    where: { id: termId },
    data: {
      name: data.name,
      subjectId,
      startDate,
      endDate,
      maxExcusedAbsences: data.maxExcusedAbsences,
      passingScore: data.passingScore,
      weightAttendance: data.weightAttendance,
      weightAssignment: data.weightAssignment,
      weightQuiz: data.weightQuiz,
      weightMidterm: data.weightMidterm,
      weightFinal: data.weightFinal,
      weightImpression: data.weightImpression,
    },
  });

  return NextResponse.json(updated);
}

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
