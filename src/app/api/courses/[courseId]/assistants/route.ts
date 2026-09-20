import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAddTA, PlanLimitError } from "@/lib/subscriptions/gate";

const schema = z.object({ email: z.string().email() });

// Only the course's teacher manages its TAs — a TA assigning further TAs
// would be a privilege-escalation path, so this deliberately doesn't use
// the usual canWriteCourse() (teacher-or-TA) check.
export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const taUser = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!taUser || taUser.role !== "TA") {
    return NextResponse.json({ error: "No TA account exists with that email" }, { status: 404 });
  }

  try {
    await assertCanAddTA(session.user.id);
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }

  const assistant = await prisma.courseAssistant.upsert({
    where: { courseId_userId: { courseId, userId: taUser.id } },
    create: { courseId, userId: taUser.id },
    update: {},
    include: { user: true },
  });

  return NextResponse.json(assistant, { status: 201 });
}
