import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAttendanceForEnrollment } from "@/lib/attendanceDefaults";

const MAX_PER_COURSE = 30;

const schema = z.object({
  name: z.string().min(1),
  chineseName: z.string().min(1).optional(),
  studentId: z.string().min(1),
});

// Authenticated self-serve join: the signed-in user is enrolled directly,
// no teacher approval step. Replaces the old JoinRequest queue — the join
// link itself (shared only with the actual class) is the access control.
export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      email: true,
      student: true,
      _count: { select: { coursesTaught: true, taAssignments: true } },
    },
  });
  // An account that already teaches or TAs somewhere can't also self-join
  // as a student — role is a single field on User, and this would silently
  // repurpose it. A brand-new signup has zero of either, so it still passes.
  if (user._count.coursesTaught > 0 || user._count.taAssignments > 0) {
    return NextResponse.json(
      { error: "This account already teaches a class. Sign in with a different account to join as a student." },
      { status: 403 }
    );
  }

  let student = user.student;

  if (!student) {
    // A teacher/TA may have already added this student to a roster (bulk
    // add, or backfilled their student ID later) before the student ever
    // signs in themselves. The student ID is the natural key that
    // recognizes that as the same person instead of creating a duplicate
    // — their entered name/Chinese name stays authoritative; joining only
    // claims the account link (and fills in email, which a roster-only
    // row never has).
    const existing = await prisma.student.findUnique({ where: { studentId: body.data.studentId } });

    if (existing) {
      if (existing.userId) {
        return NextResponse.json(
          { error: "This student ID is already linked to another account." },
          { status: 409 }
        );
      }
      student = await prisma.student.update({
        where: { id: existing.id },
        data: { userId: session.user.id, email: existing.email ?? user.email },
      });
    } else {
      student = await prisma.student.create({
        data: {
          userId: session.user.id,
          name: body.data.name,
          chineseName: body.data.chineseName,
          studentId: body.data.studentId,
          email: user.email,
        },
      });
    }
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: student.id } },
  });
  if (existingEnrollment) {
    // Reopening the same join link after already joining — treat as success.
    return NextResponse.json(existingEnrollment);
  }

  const currentCount = await prisma.enrollment.count({ where: { courseId } });
  if (currentCount >= MAX_PER_COURSE) {
    return NextResponse.json(
      { error: `Course is capped at ${MAX_PER_COURSE} students (currently ${currentCount}).` },
      { status: 400 }
    );
  }

  const enrollment = await prisma.enrollment.create({ data: { courseId, studentId: student.id } });
  await ensureAttendanceForEnrollment(enrollment.id, courseId, enrollment.joinedAt);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "STUDENT", onboardingComplete: true },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
