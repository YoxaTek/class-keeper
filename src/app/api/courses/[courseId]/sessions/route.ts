import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";
import { ensureAttendanceForSession } from "@/lib/attendanceDefaults";

const sessionSchema = z.object({
  date: z.string(),
  label: z.string().nullable().optional(),
  hasAttendance: z.boolean().default(false),
  hasQuiz: z.boolean().default(false),
  quizMaxScore: z.number().int().min(1).default(100),
  hasAssignment: z.boolean().default(false),
  assignmentMaxScore: z.number().int().min(1).default(100),
  hasMidterm: z.boolean().default(false),
  midtermMaxScore: z.number().int().min(1).default(100),
  hasFinal: z.boolean().default(false),
  finalMaxScore: z.number().int().min(1).default(100),
  hasFeedback: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canWriteCourse(session.user.id, courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = sessionSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const created = await prisma.session.create({
    data: { courseId, ...body.data, date: new Date(body.data.date) },
  });
  await ensureAttendanceForSession(created.id);

  return NextResponse.json(created, { status: 201 });
}
