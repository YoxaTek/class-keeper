import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAddTA, PlanLimitError } from "@/lib/subscriptions/gate";

const schema = z.object({ email: z.string().email() });

// Only the term's teacher manages its TAs — a TA assigning further TAs
// would be a privilege-escalation path, so this deliberately doesn't use
// the usual canWriteTerm() (teacher-or-TA) check.
export async function POST(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = await prisma.term.findUnique({ where: { id: termId }, select: { teacherId: true } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (term.teacherId !== session.user.id) {
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

  const assistant = await prisma.termAssistant.upsert({
    where: { termId_userId: { termId, userId: taUser.id } },
    create: { termId, userId: taUser.id },
    update: {},
    include: { user: true },
  });

  return NextResponse.json(assistant, { status: 201 });
}
