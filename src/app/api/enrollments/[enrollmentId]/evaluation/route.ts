import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

const schema = z.object({
  narrative: z.string().nullable(),
  impressionScore: z.number().nullable(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteTerm(session.user.id, enrollment.termId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const evaluation = await prisma.evaluation.upsert({
    where: { enrollmentId },
    create: { enrollmentId, ...body.data },
    update: body.data,
  });

  return NextResponse.json(evaluation);
}
