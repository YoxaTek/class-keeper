import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  institutionName: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { name, email, password, institutionName } = body.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  // Every self-serve signup with no invite is a teacher (role, same as the
  // Google/Facebook/LINE profile() callbacks in auth.ts) — and, with name
  // and institution already collected right here, there's nothing left for
  // a separate /onboarding step to ask, so this finishes onboarding
  // immediately instead of leaving it for later.
  await prisma.$transaction(async (tx) => {
    let organizationId: string | undefined;
    if (institutionName) {
      const org = await tx.organization.create({ data: { name: institutionName } });
      organizationId = org.id;
    }
    await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "TEACHER",
        locale: null,
        onboardingComplete: true,
        organizationId: organizationId ?? null,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
