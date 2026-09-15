import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

const schema = z.object({
  sessionId: z.string(),
  enrollmentId: z.string(),
  category: z.enum(["QUIZ", "ASSIGNMENT", "MIDTERM_READING", "MIDTERM_LISTENING", "FINAL"]),
  originalScore: z.number().nullable(),
  retakeScore: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { sessionId, enrollmentId, category, originalScore, retakeScore, note } = body.data;

  const classSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { termId: true },
  });
  if (!classSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteTerm(session.user.id, classSession.termId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.scoreRecord.upsert({
    where: { sessionId_enrollmentId_category: { sessionId, enrollmentId, category } },
    create: { sessionId, enrollmentId, category, originalScore, retakeScore, note },
    update: { originalScore, retakeScore, note },
  });

  return NextResponse.json(record);
}
