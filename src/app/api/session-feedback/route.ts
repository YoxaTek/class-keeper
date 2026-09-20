import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";

const schema = z.object({
  sessionId: z.string(),
  enrollmentId: z.string(),
  note: z.string(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { sessionId, enrollmentId, note } = body.data;

  const classSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });
  if (!classSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteCourse(session.user.id, classSession.courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.sessionFeedback.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId } },
    create: { sessionId, enrollmentId, note },
    update: { note },
  });

  return NextResponse.json(record);
}
