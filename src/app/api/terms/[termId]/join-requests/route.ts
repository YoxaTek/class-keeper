import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  studentId: z.string().min(1),
  email: z.string().email(),
});

// Public and unauthenticated by design — this is the join link/QR code a
// teacher shares with their class. The link itself (shared only with the
// actual class) is the access control; each submission just queues a
// request for the teacher to approve, never touches the real roster.
export async function POST(request: Request, { params }: { params: Promise<{ termId: string }> }) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({ where: { id: termId }, select: { id: true } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const joinRequest = await prisma.joinRequest.create({
    data: { termId, ...body.data },
  });

  return NextResponse.json(joinRequest, { status: 201 });
}
