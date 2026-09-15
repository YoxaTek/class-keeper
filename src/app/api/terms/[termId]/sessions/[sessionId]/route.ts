import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

const sessionSchema = z.object({
  date: z.string(),
  label: z.string().nullable().optional(),
  hasAttendance: z.boolean(),
  hasQuiz: z.boolean(),
  hasAssignment: z.boolean(),
  hasMidterm: z.boolean(),
  hasFinal: z.boolean(),
});

async function checkAccess(termId: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await canWriteTerm(session.user.id, termId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ termId: string; sessionId: string }> }
) {
  const { termId, sessionId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  const body = sessionSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await prisma.session.update({
    where: { id: sessionId, termId },
    data: { ...body.data, date: new Date(body.data.date) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ termId: string; sessionId: string }> }
) {
  const { termId, sessionId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  await prisma.session.delete({ where: { id: sessionId, termId } });
  return NextResponse.json({ ok: true });
}
