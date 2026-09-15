import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteTerm } from "@/lib/permissions";

const sessionSchema = z.object({
  date: z.string(),
  label: z.string().nullable().optional(),
  hasAttendance: z.boolean().default(false),
  hasQuiz: z.boolean().default(false),
  hasAssignment: z.boolean().default(false),
  hasMidterm: z.boolean().default(false),
  hasFinal: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canWriteTerm(session.user.id, termId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = sessionSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const created = await prisma.session.create({
    data: { termId, ...body.data, date: new Date(body.data.date) },
  });

  return NextResponse.json(created, { status: 201 });
}
