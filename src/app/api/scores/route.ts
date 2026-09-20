import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";

const schema = z.object({
  sessionId: z.string(),
  enrollmentId: z.string(),
  category: z.enum(["QUIZ", "ASSIGNMENT", "MIDTERM_READING", "MIDTERM_LISTENING", "FINAL"]),
  originalScore: z.number().min(0).nullable(),
  retakeScore: z.number().min(0).nullable().optional(),
  retakeMaxScore: z.number().min(0).nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { sessionId, enrollmentId, category, originalScore, retakeScore, retakeMaxScore, note } = body.data;

  const classSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      courseId: true,
      quizMaxScore: true,
      assignmentMaxScore: true,
      midtermMaxScore: true,
      finalMaxScore: true,
    },
  });
  if (!classSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteCourse(session.user.id, classSession.courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const originalMax = {
    QUIZ: classSession.quizMaxScore,
    ASSIGNMENT: classSession.assignmentMaxScore,
    MIDTERM_READING: classSession.midtermMaxScore / 2,
    MIDTERM_LISTENING: classSession.midtermMaxScore / 2,
    FINAL: classSession.finalMaxScore,
  }[category];
  if (originalScore !== null && originalScore > originalMax) {
    return NextResponse.json({ error: `originalScore cannot exceed ${originalMax}` }, { status: 400 });
  }
  if (retakeScore !== null && retakeScore !== undefined && retakeMaxScore != null && retakeScore > retakeMaxScore) {
    return NextResponse.json({ error: `retakeScore cannot exceed retakeMaxScore` }, { status: 400 });
  }

  const record = await prisma.scoreRecord.upsert({
    where: { sessionId_enrollmentId_category: { sessionId, enrollmentId, category } },
    create: { sessionId, enrollmentId, category, originalScore, retakeScore, retakeMaxScore, note },
    update: { originalScore, retakeScore, retakeMaxScore, note },
  });

  return NextResponse.json(record);
}
