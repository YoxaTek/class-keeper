import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  enrollmentId: z.string(),
  comment: z.string().min(1),
});

// The only write route students are allowed to call, and only for their
// own enrollment — never trust a client-supplied enrollmentId without
// checking it actually belongs to this student.
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
  if (!student) return NextResponse.json({ error: "No student profile" }, { status: 403 });

  const enrollment = await prisma.enrollment.findUnique({ where: { id: body.data.enrollmentId } });
  if (!enrollment || enrollment.studentId !== student.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const feedback = await prisma.feedback.create({
      data: { enrollmentId: enrollment.id, comment: body.data.comment },
    });
    return NextResponse.json(feedback, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Feedback already submitted for this course" }, { status: 409 });
    }
    throw e;
  }
}
