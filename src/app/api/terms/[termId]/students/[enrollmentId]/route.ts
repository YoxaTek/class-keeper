import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

async function checkAccess(termId: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await canWriteTerm(session.user.id, termId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

const renameSchema = z.object({ name: z.string().min(1) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ termId: string; enrollmentId: string }> }
) {
  const { termId, enrollmentId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  const body = renameSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId, termId } });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const student = await prisma.student.update({
    where: { id: enrollment.studentId },
    data: { name: body.data.name },
  });

  return NextResponse.json(student);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ termId: string; enrollmentId: string }> }
) {
  const { termId, enrollmentId } = await params;
  const access = await checkAccess(termId);
  if (access.error) return access.error;

  await prisma.enrollment.delete({ where: { id: enrollmentId, termId } });
  return NextResponse.json({ ok: true });
}
