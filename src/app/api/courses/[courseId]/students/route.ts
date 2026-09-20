import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";
import { ensureAttendanceForEnrollment } from "@/lib/attendanceDefaults";

const MAX_PER_COURSE = 30;

const bulkAddSchema = z.object({
  names: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canWriteCourse(session.user.id, courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = bulkAddSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const currentCount = await prisma.enrollment.count({ where: { courseId } });
  if (currentCount + body.data.names.length > MAX_PER_COURSE) {
    return NextResponse.json(
      { error: `Course is capped at ${MAX_PER_COURSE} students (currently ${currentCount}).` },
      { status: 400 }
    );
  }

  // Sequential, not a transaction batch: the DB trigger is the authoritative
  // cap enforcement and needs to see each prior insert before the next.
  const created = [];
  for (const rawName of body.data.names) {
    const name = rawName.trim();
    if (!name) continue;
    const student = await prisma.student.create({ data: { name } });
    const enrollment = await prisma.enrollment.create({
      data: { courseId, studentId: student.id },
      include: { student: true },
    });
    await ensureAttendanceForEnrollment(enrollment.id, courseId, enrollment.joinedAt);
    created.push(enrollment);
  }

  return NextResponse.json(created, { status: 201 });
}
