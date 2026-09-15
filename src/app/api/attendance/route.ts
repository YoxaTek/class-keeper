import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

const schema = z.object({
  sessionId: z.string(),
  enrollmentId: z.string(),
  status: z.enum(["PRESENT", "EXCUSED", "ABSENT", "NOT_ENROLLED", "ABROAD"]),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { sessionId, enrollmentId, status } = body.data;

  const classSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { termId: true },
  });
  if (!classSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteTerm(session.user.id, classSession.termId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.attendance.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId } },
    create: { sessionId, enrollmentId, status },
    update: { status },
  });

  return NextResponse.json(record);
}
