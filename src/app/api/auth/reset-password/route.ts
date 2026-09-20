import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Paired with verify-email — see that route's comment on why this is a
// temporary, weaker-than-usual reset flow (email address only, no token).
export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(body.data.password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
