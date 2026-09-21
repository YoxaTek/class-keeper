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
      // The student ID is the authoritative match, full stop — whoever
      // shows up with it is treated as that same roster row, even if it
      // was already linked to a different account (a prior mistaken join,
      // a teacher re-entering it, etc.). Update in place rather than ever
      // creating a second row for the same ID.
      student = await prisma.student.update({
        where: { id: existing.id },
        data: {
          userId: session.user.id,
          // Never overwrite what a teacher/TA already entered — only fill
          // in whatever's still blank, same rule as the roster edit form.
          email: existing.email ?? user.email,
          chineseName: existing.chineseName ?? body.data.chineseName,
        },
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

  let enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: student.id } },
  });

  if (!enrollment) {
    const currentCount = await prisma.enrollment.count({ where: { courseId } });
    if (currentCount >= MAX_PER_COURSE) {
      return NextResponse.json(
        { error: `Course is capped at ${MAX_PER_COURSE} students (currently ${currentCount}).` },
        { status: 400 }
      );
    }

    enrollment = await prisma.enrollment.create({ data: { courseId, studentId: student.id } });
    await ensureAttendanceForEnrollment(enrollment.id, courseId, enrollment.joinedAt);
  }

  // Finalize the account as a student either way — reopening the same
  // join link (an enrollment already existed) is still this account's
  // first time actually landing here, same as a re-linked student row
  // that happened to already be enrolled from a previous owner (see
  // above). Skipping this on the "already enrolled" branch was exactly
  // the bug: the account never got marked STUDENT/onboarded and was left
  // however it started (often TEACHER, from the default signup role).
  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "STUDENT", onboardingComplete: true },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
