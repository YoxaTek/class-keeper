import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";
import { ensureAttendanceForEnrollment } from "@/lib/attendanceDefaults";

const MAX_PER_TERM = 30;

async function checkAccess(termId: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await canWriteTerm(session.user.id, termId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// Approve: promotes the request into a real Student + Enrollment and
// removes the request. Reject: DELETE this route with no body, just removes
// the request.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ termId: string; requestId: string }> }
) {
  const { termId, requestId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  const joinRequest = await prisma.joinRequest.findUnique({ where: { id: requestId, termId } });
  if (!joinRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentCount = await prisma.enrollment.count({ where: { termId } });
  if (currentCount >= MAX_PER_TERM) {
    return NextResponse.json(
      { error: `Term is capped at ${MAX_PER_TERM} students (currently ${currentCount}).` },
      { status: 400 }
    );
  }

  const student = await prisma.student.create({
    data: { name: joinRequest.name, studentId: joinRequest.studentId, email: joinRequest.email },
  });
  const enrollment = await prisma.enrollment.create({
    data: { termId, studentId: student.id },
    include: { student: true },
  });
  await ensureAttendanceForEnrollment(enrollment.id, termId, enrollment.joinedAt);
  await prisma.joinRequest.delete({ where: { id: requestId } });

  return NextResponse.json(enrollment, { status: 201 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ termId: string; requestId: string }> }
) {
  const { termId, requestId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  await prisma.joinRequest.delete({ where: { id: requestId, termId } }).catch(() => {
    // Already resolved/removed — nothing to reject.
  });

  return NextResponse.json({ ok: true });
}
