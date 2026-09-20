import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  confirmEmail: z.string(),
  password: z.string().optional(),
});

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { confirmEmail, password } = body.data;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true },
  });

  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "confirm_email_mismatch" }, { status: 400 });
  }

  if (user.passwordHash) {
    const valid = typeof password === "string" && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  // ponytail: no PayPal cancellation here — Subscription.userId is set null
  // on delete (not cascaded), so an active subscription would keep billing
  // with nothing pointing at it. Wire in a POST /v1/billing/subscriptions/
  // {id}/cancel call once PayPal is actually configured for this app.
  await prisma.$transaction([
    // Course.teacherId is ON DELETE RESTRICT, so a teacher's courses (and
    // everything under them — enrollments, sessions, attendance, scores,
    // invites) must be deleted explicitly before the user row itself.
    prisma.course.deleteMany({ where: { teacherId: session.user.id } }),
    prisma.user.delete({ where: { id: session.user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
