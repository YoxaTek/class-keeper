import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";
import { ensureAttendanceForSession } from "@/lib/attendanceDefaults";

const sessionSchema = z.object({
  date: z.string(),
  label: z.string().nullable().optional(),
  hasAttendance: z.boolean(),
  hasQuiz: z.boolean(),
  quizMaxScore: z.number().int().min(1).default(100),
  hasAssignment: z.boolean(),
  assignmentMaxScore: z.number().int().min(1).default(100),
  hasMidterm: z.boolean(),
  midtermMaxScore: z.number().int().min(1).default(100),
  hasFinal: z.boolean(),
  finalMaxScore: z.number().int().min(1).default(100),
  hasFeedback: z.boolean(),
});

async function checkAccess(courseId: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await canWriteCourse(session.user.id, courseId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; sessionId: string }> }
) {
  const { courseId, sessionId } = await params;
  const access = await checkAccess(courseId);
  if (access.error) return access.error;

  const body = sessionSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await prisma.session.update({
    where: { id: sessionId, courseId },
    data: { ...body.data, date: new Date(body.data.date) },
  });
  await ensureAttendanceForSession(updated.id);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; sessionId: string }> }
) {
  const { courseId, sessionId } = await params;
  const access = await checkAccess(courseId);
  if (access.error) return access.error;

  await prisma.session.delete({ where: { id: sessionId, courseId } });
  return NextResponse.json({ ok: true });
}
