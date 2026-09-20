import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateSubjectId } from "@/lib/getOrCreateSubject";
import { courseInputSchema, validateCourseDateRange } from "@/lib/validation/course";

// Only the owning teacher can edit a course's settings — mirrors the DELETE
// rule below, and creation (only a TEACHER can POST /api/courses).
export async function PATCH(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = courseInputSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const data = body.data;

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const dateError = validateCourseDateRange(startDate, endDate);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  const subjectId = await getOrCreateSubjectId(data.subjectName);

  const updated = await prisma.course.update({
    where: { id: courseId },
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
      institute: data.institute ?? null,
    },
  });

  return NextResponse.json(updated);
}

// Only the owning teacher can delete a course — not a TA, even one with
// write access to it. Cascades (via schema onDelete: Cascade) take
// enrollments, sessions, attendance, scores, evaluations, feedback,
// TA assignments, and pending invites for this course with it. The
// underlying Student and Subject rows are untouched.
export async function DELETE(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ ok: true });
}
