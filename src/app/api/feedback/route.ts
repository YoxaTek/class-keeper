import { NextResponse } from "next/server";
import { z } from "zod";
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
  // Role comes from the database, not the session cookie: joining a class
  // flips the account to STUDENT in the DB, but the cookie keeps the role it
  // was minted with until the next sign-in (see getCurrentUser), so a student
  // who joined in this same visit would be refused here.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "STUDENT") {
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

  // One feedback per enrollment, and the student can come back and edit it:
  // submitting again replaces the comment and refreshes the submitted time.
  const feedback = await prisma.feedback.upsert({
    where: { enrollmentId: enrollment.id },
    create: { enrollmentId: enrollment.id, comment: body.data.comment },
    update: { comment: body.data.comment, submittedAt: new Date() },
  });
  return NextResponse.json(feedback, { status: 200 });
}
